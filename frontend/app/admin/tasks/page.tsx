import { redirect } from "next/navigation";
import { fetchTasksAction } from "@/lib/actions/task";
import { fetchMembersAction } from "@/lib/actions/member";
import { toStaffOptions } from "@/lib/api/member";
import { fetchCasesAction } from "@/lib/actions/case";
import TasksPageClient from "./_components/TasksPageClient";

export default async function TasksPage() {
    const [tasksResult, membersResult, casesResult] = await Promise.all([
        fetchTasksAction(),
        fetchMembersAction(1, 100),
        fetchCasesAction(1, 100),
    ]);

    if (!tasksResult.success && tasksResult.message === "Not authenticated") {
        redirect("/login");
    }

    const tasks = tasksResult.data ?? [];
    const members = toStaffOptions(membersResult.data ?? []);
    const cases = (casesResult.data ?? []).map((c: any) => ({
        _id: c._id,
        title: c.title,
        caseNumber: c.caseNumber,
    }));

    return <TasksPageClient tasks={tasks} members={members} cases={cases} />;
}
