const { OpenAI } = require("openai");
const fs = require("fs");
const config = require("../config/env");

// OpenAI 인스턴스 생성
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

// 파일을 Base64 인코딩
const encodeImage = (filePath) => {
  const imageFile = fs.readFileSync(filePath);
  return Buffer.from(imageFile).toString("base64");
};

const detectStoryWithChatGPT = async (filePath) => {
  const base64Image = encodeImage(filePath);
  const prompt = (
    "다음은 업로드된 이미지 파일에 대한 분석 작업입니다. 다음 단계에 따라 작업을 수행하세요:" +
    "1. 이미지의 내용을 간결하고 명확하게 묘사하세요." +
    "2. 이미지에서 주요한 객체 3개를 식별하고, 각 객체를 간략히 설명하세요." +
    "3. 식별된 3개의 객체를 중심으로 창의적이고 감동적인 500자 분량의 동화를 작성하세요." +
    "4. 최종 출력은 다음 형식의 내용만 제공하세요: {객체1, 객체2, 객체3, 동화 제목: '동화 제목', 동화 내용: '동화 내용'}."
  );

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          // FAST API에서는 content 항목에 배열 형태로 전달하므로 동일하게 구성합니다.
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      // FAST API 코드와 동일하게 max_tokens를 600로 설정합니다.
      max_tokens: 600,
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI 호출 에러:", err);
    throw new Error("OpenAI API 호출에 실패했습니다.");
  }
};

module.exports = { detectStoryWithChatGPT };