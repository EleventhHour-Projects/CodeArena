import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let titleSlug = '';
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const problemsIndex = pathParts.indexOf('problems');
      if (problemsIndex === -1 || !pathParts[problemsIndex + 1]) {
        throw new Error("Invalid LeetCode URL structure.");
      }
      titleSlug = pathParts[problemsIndex + 1];
    } catch (e: any) {
       return NextResponse.json({ error: e.message || 'Invalid URL' }, { status: 400 });
    }

    const query = `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          questionFrontendId
          title
          titleSlug
          content
          difficulty
          exampleTestcases
          topicTags {
            name
          }
        }
      }
    `;

    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com/',
      },
      body: JSON.stringify({
        query,
        variables: { titleSlug },
      }),
    });

    if (!response.ok) {
        return NextResponse.json({ error: `Failed to fetch from LeetCode: ${response.statusText}` }, { status: 500 });
    }

    const data = await response.json();
    if (!data.data || !data.data.question) {
        return NextResponse.json({ error: 'Problem not found or invalid response from LeetCode' }, { status: 404 });
    }

    const leetcodeData = data.data.question;

    const stripHtml = (html: string) => {
        if (!html) return "";
        return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    };

    const newDescription = stripHtml(leetcodeData.content);

    return NextResponse.json({ 
        title: leetcodeData.title,
        slug: leetcodeData.titleSlug,
        difficulty: leetcodeData.difficulty,
        description: newDescription,
        tags: leetcodeData.topicTags ? leetcodeData.topicTags.map((tag: any) => tag.name) : []
    });

  } catch (error: any) {
    console.error('Error fetching leetcode data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch' },
      { status: 500 }
    );
  }
}
