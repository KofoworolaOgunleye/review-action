import { Octokit } from '@octokit/rest';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
const prNumber = parseInt(process.env.PR_NUMBER);

async function postOrUpdateReview(owner: string, repo: string, prNumber: number, reviewContent: string): Promise<void> {
  try {
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    const existingComment = comments.find(comment =>
      comment.body.includes('<!-- AI-REVIEW-COMMENT -->')
    );

    const commentBody = `<!-- AI-REVIEW-COMMENT -->
                        ## AI Code Review

    ${reviewContent}
`;

    if (existingComment) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      console.log(`Updated existing AI review comment: ${existingComment.id}`);
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody,
      });
      console.log('Created new AI review comment');
    }
  } catch (error) {
    console.error('Error posting/updating review:', error);
    throw error;
  }
}

async function getAIReview(diff: string): Promise<string> {
  try {
    const instruction = `You are a senior software engineer doing a code review. 
          Analyze the provided git diff and give constructive feedback focusing on:
          - Code quality and best practices
          - Potential bugs or issues
          - Performance considerations
          - Security concerns
          - Maintainability
          
          Keep your review concise and actionable. If the changes look good, say so briefly.`;


    console.log('Getting AI review...');
    const response = await client.responses.create({
      model: 'gpt-4o',
      instructions: instruction,
      input: diff
    });
    return response.output_text || 'Unable to generate review.';
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return `Error generating AI review: ${error}`;
  }
}

  async function main(): Promise<void> {
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

      console.log('Getting AI review...');
      const reviewContent = await getAIReview(diff);

      console.log('Posting/updating review comment...');
      await postOrUpdateReview(owner, repo, prNumber, reviewContent);

      console.log('AI review completed successfully!');

    } catch (error) {
      console.error('Error generating AI review:', error);
      process.exit(1);
    }
  }

  main();