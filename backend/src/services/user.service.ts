import { UserMongoRepository, UserQuery } from "../repositories/user.repository";
import { CreateUserDTO, LoginUserDTO, AdminCreateUserDTO, AdminUpdateUserDTO } from "../dtos/user.dto";
import { PublicUser, toPublicUser } from "../models/user.model";
import { HttpException } from "../exceptions/http-exception";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { SECRET_KEY, FRONTEND_URL } from "../configs/constant";
import { generateResetToken, hashResetToken } from "../utils/password-reset.util";
import { sendMail } from "../utils/mail.util";
import { CaseModel } from "../models/case.model";
import { TaskModel } from "../models/task.model";

const userRepository = new UserMongoRepository();

export class UserService {
    async getAll(query: UserQuery): Promise<{ data: PublicUser[]; total: number }> {
        const { data, total } = await userRepository.getAll(query);
        return { data: data.map(toPublicUser), total };
    }

    async getById(id: string): Promise<PublicUser> {
        const user = await userRepository.getUserById(id);
        if (!user) {
            throw new HttpException(404, "User not found");
        }
        return toPublicUser(user);
    }

    async adminCreateUser(userData: AdminCreateUserDTO): Promise<PublicUser> {
        const existingEmail = await userRepository.getUserByEmail(userData.email);
        if (existingEmail) {
            throw new HttpException(400, "Email already exists");
        }

        const hashedPassword = await bcryptjs.hash(userData.password, 10);
        const created = await userRepository.createUser({
            ...userData,
            password: hashedPassword,
        });
        return toPublicUser(created);
    }

    async adminUpdateUser(id: string, updateData: AdminUpdateUserDTO): Promise<PublicUser> {
        return this.updateUser(id, updateData);
    }

    async deleteUser(id: string): Promise<void> {
        const user = await userRepository.getUserById(id);
        if (!user) {
            throw new HttpException(404, "User not found");
        }

        const [caseCount, taskCount] = await Promise.all([
            CaseModel.countDocuments({ assignedAttorney: id, status: { $ne: "closed" } }),
            TaskModel.countDocuments({ assignee: id, status: { $ne: "done" } }),
        ]);
        if (caseCount > 0 || taskCount > 0) {
            throw new HttpException(
                400,
                `Cannot delete this user — they're the attorney on ${caseCount} open case(s) and assigned to ${taskCount} open task(s). Deactivate the account instead, or reassign their work first.`
            );
        }

        await userRepository.delete(id);
    }

    async createUser(userData: CreateUserDTO): Promise<PublicUser> {
        const existingEmail = await userRepository.getUserByEmail(userData.email);
        if (existingEmail) {
            throw new HttpException(400, "Email already exists");
        }

        const hashedPassword = await bcryptjs.hash(userData.password, 10);
        userData.password = hashedPassword;

        const created = await userRepository.createUser(userData);
        // Never return the password hash to the client.
        return toPublicUser(created);
    }

    async loginUser(loginData: LoginUserDTO): Promise<{ user: PublicUser; token: string }> {
        const user = await userRepository.getUserByEmail(loginData.email);
        if (!user) {
            // Use one generic message for both branches so the response can't be
            // used to discover which emails are registered.
            throw new HttpException(400, "Invalid email or password");
        }

        const isPasswordValid = await bcryptjs.compare(loginData.password, user.password);
        if (!isPasswordValid) {
            throw new HttpException(400, "Invalid email or password");
        }

        if (!user.isActive) {
            throw new HttpException(403, "This account has been deactivated. Contact your firm administrator.");
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            SECRET_KEY,
            { expiresIn: "30d" }
        );

        return { user: toPublicUser(user), token };
    }

    async updateUser(userId: string, updateData: AdminUpdateUserDTO & { profileImage?: string }): Promise<PublicUser> {
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new HttpException(404, "User not found");
        }

        if (updateData.email && updateData.email !== user.email) {
            const existing = await userRepository.getUserByEmail(updateData.email);
            if (existing) {
                throw new HttpException(400, "Email already in use");
            }
        }

        if (updateData.password) {
            updateData.password = await bcryptjs.hash(updateData.password, 10);
        }

        const updated = await userRepository.update(userId, updateData);
        if (!updated) {
            throw new HttpException(500, "Failed to update user");
        }
        return toPublicUser(updated);
    }

    async updateProfileImage(userId: string, imagePath: string): Promise<PublicUser> {
        const updated = await userRepository.update(userId, { profileImage: imagePath });
        if (!updated) {
            throw new HttpException(404, "User not found");
        }
        return toPublicUser(updated);
    }

    /**
     * Always resolves the same way whether or not the email is registered —
     * this endpoint must not be usable to enumerate accounts. The raw token
     * only ever exists in the email itself; only its hash is persisted.
     */
    async forgotPassword(email: string): Promise<void> {
        const user = await userRepository.getUserByEmail(email);
        if (!user) return;

        const { token, hash, expiresAt } = generateResetToken();
        await userRepository.setPasswordResetToken(user._id.toString(), hash, expiresAt);

        const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
        await sendMail(
            user.email,
            "Reset your Lexcore password",
            `We received a request to reset your Lexcore password. This link expires in 1 hour:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email — your password hasn't been changed.`
        );
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        const user = await userRepository.getUserByResetTokenHash(hashResetToken(token));
        if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
            throw new HttpException(400, "This reset link is invalid or has expired");
        }

        const hashedPassword = await bcryptjs.hash(newPassword, 10);
        await userRepository.update(user._id.toString(), { password: hashedPassword });
        await userRepository.clearPasswordResetToken(user._id.toString());

        await sendMail(
            user.email,
            "Your Lexcore password was changed",
            "Your password was just reset. If this wasn't you, contact your firm administrator immediately."
        );
    }

    /** Self-service password change — distinct from resetPassword (no token,
     * requires proving you already know the current password) and from
     * adminUpdateUser (an admin resetting someone else's password doesn't
     * need to know their old one). */
    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        const user = await userRepository.getUserById(userId);
        if (!user) throw new HttpException(404, "User not found");

        const isCurrentValid = await bcryptjs.compare(currentPassword, user.password);
        if (!isCurrentValid) {
            throw new HttpException(400, "Current password is incorrect");
        }

        const hashedPassword = await bcryptjs.hash(newPassword, 10);
        await userRepository.update(userId, { password: hashedPassword });

        await sendMail(
            user.email,
            "Your Lexcore password was changed",
            "Your password was just changed. If this wasn't you, contact your firm administrator immediately."
        );
    }

    /** Deactivate/reactivate a staff account without deleting it — case,
     * task, and invoice references stay resolvable, but a deactivated
     * account can no longer log in (see loginUser above). */
    async setActive(userId: string, isActive: boolean): Promise<PublicUser> {
        const updated = await userRepository.update(userId, { isActive });
        if (!updated) throw new HttpException(404, "User not found");
        return toPublicUser(updated);
    }
}
