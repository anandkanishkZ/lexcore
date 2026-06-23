import { UserMongoRepository } from "../repositories/user.repository";
import { CreateUserDTO, LoginUserDTO } from "../dtos/user.dto";
import { PublicUser, toPublicUser } from "../models/user.model";
import { HttpException } from "../exceptions/http-exception";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../configs/constant";

const userRepository = new UserMongoRepository();

export class UserService {
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

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            SECRET_KEY,
            { expiresIn: "30d" }
        );

        return { user: toPublicUser(user), token };
    }

    async updateProfileImage(userId: string, imagePath: string): Promise<PublicUser> {
        const updated = await userRepository.update(userId, { profileImage: imagePath });
        if (!updated) {
            throw new HttpException(404, "User not found");
        }
        return toPublicUser(updated);
    }
}
