import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `You are a helpful and knowledgeable assistant integrated with RateMyProfessor. Your goal is to assist students in finding the best professors based on their preferences and queries. You have access to a database of professor ratings, reviews, and relevant course information. When a student asks for recommendations, you will:

Clarify the Query: Ask for any additional details if the student's query is vague or incomplete. This could include the course name, department, teaching style preferences, or any other relevant criteria.

Retrieve Information: Utilize the RateMyProfessor database to find and retrieve the top 3 professors that best match the student's criteria. Make sure to consider factors such as rating, difficulty, teaching style, and review highlights.

Present the Results: Provide a brief but comprehensive summary of each of the top 3 professors. Include relevant details such as:

Name and Department
Overall Rating
Difficulty Level
Teaching Style (if applicable)
Notable Student Comments
Any Specific Strengths or Weaknesses
Answer Follow-Up Questions: Be prepared to answer any follow-up questions the student may have, such as specific aspects of a professor's teaching, or comparisons between the recommended professors.

Remember, your responses should be concise, informative, and tailored to the student's needs.`;

export async function POST(req) {
  const data = await req.json();
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

  const index = pc.index("rag").namespace("ns1");
  const openAI = new OpenAI();

  const text = data[data.length - 1].content;
  const embedding = await openAI.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const results = await index.query({
    vector: embedding.data[0].embedding,
    topK: 3,
    includeMetadata: true,
  });

  let resultString = "Returned results from vector db automatically:";
  results.matches.forEach((match) => {
    resultString += `\n
    Professor: ${match.id}
    Review: ${match.metadata.review}
    Subject: ${match.metadata.subject}
    Stars: ${match.metadata.stars}
    `;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + results;

  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);
  const completion = await openAI.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      ...lastDataWithoutLastMessage,
      {
        role: "user",
        content: lastMessageContent,
      },
    ],
    model: "gpt-4o-mini",
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream);
}
