import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PR_NUMBER = process.env.PR_NUMBER;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

// if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY not set');
// if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not set');
// if (!PR_NUMBER) throw new Error('PR_NUMBER not set');
// if (!GITHUB_REPOSITORY) throw new Error('GITHUB_REPOSITORY not set');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const client = new OpenAI({ apiKey: OPENAI_KEY });
const octokit = new Octokit({ auth: GITHUB_TOKEN });

const [owner, repo] = GITHUB_REPOSITORY.split('/');

async function main() {
  try {
    const diffPath = path.resolve(process.cwd(), 'pr.diff');

    if (!fs.existsSync(diffPath)) {
      throw new Error('PR diff file not found');
    }

    const diff = fs.readFileSync(diffPath, 'utf8');

    if (!diff.trim()) {
      console.log('No changes to review');
      return;
    }

    // async function postComment(prNumber: number, body: string) {
    //   await octokit.rest.issues.createComment({
    //     owner: GITHUB_OWNER,
    //     repo: GITHUB_REPO,
    //     issue_number: prNumber,
    //     body
    //   });
    // }
    // You are an expert senior cloud infrastructure engineer performing a thorough pull-request level code review.

    //   const instruction = `
    // You are an expert senior code reviewer that reviews pull requests across different languages and frameworks performing a thorough pull-request level code review.
    // Given the PR diff below, produce:
    // 1) A short summary of what changed in the PR and stick to the facts.
    // 2) Potential bugs, logic flaws, typos, incorrect resource usage or edge cases introduced.
    // 3) Security concerns.
    // 4) Suggestions for improvements (performance, style, tests).
    // 5) Suggestions for best practices.

    // Keep the review actionable, numbered, and include exact file paths and line snippets when relevant.
    // `;

    const instruction = `
You are an expert senior code reviewer that reviews pull requests across different languages and frameworks performing a thorough pull-request level code review.
Given the PR diff below, produce:
- A short summary of what changed in the PR and stick to the facts.
- Potential bugs, logic flaws, typos, incorrect resource usage or edge cases introduced.
- Security concerns.
- Suggestions for improvements (performance, style, tests) and best practices.
- Provide comments and suggestions ONLY if there is something to improve, otherwise "reviews" should be an empty array.
- Write the comment in GitHub Markdown format.
- Keep the review actionable, numbered, and include exact file paths and line snippets when relevant.
`;

    //   const instruction = `

    // You are an expert senior software engineer performing a thorough pull-request level code review. You have extensive experience across multiple technology stacks including but not limited to frontend, backend, infrastructure, and DevOps.
    // Given the PR diff below, produce:

    // 1) **Change Summary**: A brief, factual description of what changed in this PR.

    // 2) **Issues & Concerns**: Identify potential problems including but no limited to:
    //    - Bugs, logic flaws, and edge cases
    //    - Syntax errors, typos, or incorrect usage  
    //    - Resource leaks, inefficient operations, or performance issues
    //    - Missing error handling, input validation, or edge case coverage

    // 3) **Security Analysis**: Evaluate security implications such as:
    //    - Input validation vulnerabilities
    //    - Authentication and authorization weaknesses
    //    - Sensitive data exposure or improper handling
    //    - Missing security headers, encryption, or access controls

    // 4) **Improvement Suggestions**: Recommend enhancements for:
    //    - Performance optimizations and efficiency improvements
    //    - Code style, readability, and maintainability
    //    - Test coverage, test quality, and missing test cases
    //    - Documentation completeness and code comments

    // 5) **Best Practices**: Suggest adherence to:
    //    - Language and framework-specific conventions
    //    - Design patterns, architecture principles, and code organization
    //    - Industry standards and established methodologies
    //    - Maintainability and scalability considerations
    //    `;

    console.log('Getting AI review...');
    const response = await client.responses.create({
      model: 'gpt-4o',
      instructions: instruction,
      input: diff
    });

    const reviewText = response.output_text;
    console.log('AI Review generated');

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: parseInt(PR_NUMBER),
      body: `## AI Code Review\n\n${reviewText}`
    });

    console.log(`Review posted on PR #${PR_NUMBER}`);

  } catch (error) {
    console.error('Error during review:', error);

    // await octokit.rest.issues.createComment({
    //   owner,
    //   repo,
    //   issue_number: parseInt(PR_NUMBER),
    //   body: `## AI Review Failed\n\nThe AI review encountered an error: ${error.message}`
    // });

    process.exit(1);
  }
}

main();