import { CaseMongoRepository } from "../repositories/case.repository";
import { CaseFileMongoRepository } from "../repositories/case-file.repository";
import { CaseService } from "./case.service";
import { HttpException } from "../exceptions/http-exception";
import { chatComplete } from "../utils/deepseek.util";

const caseRepository = new CaseMongoRepository();
const fileRepository = new CaseFileMongoRepository();
const caseService = new CaseService();

const SEARCH_LIMIT = 5;
const EXCERPT_LENGTH = 500;
const MAX_SUMMARY_FILES = 10;

export type AiSource =
    | { type: "case"; id: string; title: string; caseNumber: string; excerpt: string }
    | { type: "document"; id: string; name: string; caseId: string; caseTitle: string; excerpt: string };

function excerptOf(text: string): string {
    const trimmed = text.trim();
    return trimmed.length > EXCERPT_LENGTH ? `${trimmed.slice(0, EXCERPT_LENGTH)}…` : trimmed;
}

export class AiService {
    /** Pure MongoDB $text retrieval — no DeepSeek call. Reused by ask(), and
     * useful on its own for a quick keyword browse. No case-visibility
     * scoping beyond staffMiddleware, matching GET /cases' current (unscoped
     * for staff) behavior. */
    async search(query: string): Promise<AiSource[]> {
        const [cases, files] = await Promise.all([
            caseRepository.searchText(query, SEARCH_LIMIT),
            fileRepository.searchText(query, SEARCH_LIMIT),
        ]);

        const caseSources: AiSource[] = cases.map((c) => ({
            type: "case",
            id: c._id.toString(),
            title: c.title,
            caseNumber: c.caseNumber,
            excerpt: excerptOf(c.description || c.title),
        }));

        const fileSources: AiSource[] = files.map((f) => {
            const populatedCase = f.case as unknown as { _id: { toString(): string }; title?: string } | null;
            return {
                type: "document",
                id: f._id.toString(),
                name: f.name,
                caseId: populatedCase?._id?.toString() ?? f.case.toString(),
                caseTitle: populatedCase?.title ?? "",
                excerpt: excerptOf(f.extractedText || f.name),
            };
        });

        return [...caseSources, ...fileSources];
    }

    async ask(query: string): Promise<{ answer: string; sources: AiSource[] }> {
        const sources = await this.search(query);

        if (sources.length === 0) {
            return { answer: "I couldn't find anything in the case files matching that question.", sources };
        }

        const context = sources
            .map((s, i) => {
                const label =
                    s.type === "case"
                        ? `Case "${s.title}" (${s.caseNumber})`
                        : `Document "${s.name}" (case: ${s.caseTitle})`;
                return `[${i + 1}] ${label}\n${s.excerpt}`;
            })
            .join("\n\n");

        const answer = await chatComplete([
            {
                role: "system",
                content:
                    "You are a legal case assistant. Answer the user's question using ONLY the numbered excerpts " +
                    "below. If they don't contain enough information to answer, say so plainly rather than " +
                    "guessing. Be concise.",
            },
            { role: "user", content: `Question: ${query}\n\nExcerpts:\n${context}` },
        ]);

        return { answer, sources };
    }

    async summarizeCase(caseId: string): Promise<{ summary: string }> {
        // No requestingUser passed — same "any staff" visibility as
        // GET /cases, per the AI-search-scope decision.
        const caseDoc = await caseService.getById(caseId);
        const files = await fileRepository.listAllByCase(caseId, MAX_SUMMARY_FILES);

        const documentsText = files
            .filter((f) => f.extractedText)
            .map((f) => `Document "${f.name}":\n${f.extractedText}`)
            .join("\n\n");

        const content = [
            `Title: ${caseDoc.title}`,
            `Case number: ${caseDoc.caseNumber}`,
            `Type: ${caseDoc.type}`,
            `Status: ${caseDoc.status}`,
            caseDoc.description ? `Description: ${caseDoc.description}` : "",
            documentsText,
        ]
            .filter(Boolean)
            .join("\n\n");

        const summary = await chatComplete([
            {
                role: "system",
                content:
                    "You are a legal case assistant. Write a concise summary (3-5 sentences) of the case below " +
                    "for a staff member skimming their caseload.",
            },
            { role: "user", content },
        ]);

        return { summary };
    }

    /**
     * Multi-turn Q&A grounded in one document — unlike ask(), which searches
     * across every case/document, this is scoped to a single already-open
     * document. The backend stays stateless: the client resends the full
     * turn history (capped by ChatAboutDocumentSchema) on every message,
     * same as any standard OpenAI-compatible multi-turn chat integration.
     */
    async chatAboutDocument(
        fileId: string,
        query: string,
        history: { role: "user" | "assistant"; content: string }[]
    ): Promise<{ answer: string }> {
        // No requestingUser/file-access check — same "any staff, unscoped"
        // visibility as search()/ask()/summarizeCase() above. Per-matter
        // confidentiality between staff (an "Ethical Wall") is explicit
        // deferred scope for this project (see PROJECT_PLAN.md's Deferred /
        // Out of Scope section) — until that exists, restricting this one
        // endpoint while search()/ask() stay firm-wide would be an
        // inconsistent, false sense of scoping rather than real protection.
        const file = await fileRepository.getById(fileId);
        if (!file) throw new HttpException(404, "Document not found");
        if (!file.extractedText) {
            throw new HttpException(400, "No extractable text is available for this document");
        }

        const answer = await chatComplete([
            {
                role: "system",
                content:
                    "You are a legal case assistant. Answer questions about the document below using ONLY its " +
                    "content. If the answer isn't in the document, say so plainly rather than guessing. Be concise.\n\n" +
                    `Document "${file.name}":\n${file.extractedText}`,
            },
            ...history,
            { role: "user", content: query },
        ]);

        return { answer };
    }

    async summarizeDocument(fileId: string): Promise<{ summary: string }> {
        // Same "any staff, unscoped" visibility as chatAboutDocument above.
        const file = await fileRepository.getById(fileId);
        if (!file) throw new HttpException(404, "Document not found");
        if (!file.extractedText) {
            throw new HttpException(400, "No extractable text is available for this document");
        }

        const summary = await chatComplete([
            {
                role: "system",
                content: "You are a legal case assistant. Write a concise summary (2-4 sentences) of the document below.",
            },
            { role: "user", content: `Document "${file.name}":\n${file.extractedText}` },
        ]);

        return { summary };
    }
}
