// services/ttsService.js
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const client = new textToSpeech.TextToSpeechClient();

/**
 * 동화 텍스트를 mp3로 변환 후 디스크에 저장
 * @param {string} text - 변환할 텍스트 (동화 내용)
 * @param {string} filename - 저장할 파일명 (확장자 제외, 이미지와 동일한 이름 사용)
 * @returns {Promise<string>} - 저장된 audio_url
 */
const synthesizeSpeech = async (text, filename) => {
  const request = {
    input: { text },
    voice: {
      languageCode: 'ko-KR',
      name: 'ko-KR-Neural2-A',  // 한국어 Neural2 여성 음성
      ssmlGender: 'FEMALE',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.9,   // 동화 낭독에 적합한 약간 느린 속도 (기본값: 1.0)
      pitch: 0,
    },
  };

  const [response] = await client.synthesizeSpeech(request);

  // audios 디렉토리 없으면 자동 생성
  if (!fs.existsSync(config.AUDIO_DIRECTORY)) {
    fs.mkdirSync(config.AUDIO_DIRECTORY, { recursive: true });
  }

  const audioFilename = `${path.parse(filename).name}.mp3`;
  const filePath = path.join(config.AUDIO_DIRECTORY, audioFilename);

  fs.writeFileSync(filePath, response.audioContent, 'binary');

  const audio_url = `http://localhost:${config.PORT}/${config.AUDIO_DIRECTORY}/${audioFilename}`;
  return audio_url;
};

/**
 * 음성 파일 삭제
 * @param {string} filename - 이미지와 동일한 기본 파일명 (확장자 제외)
 */
const deleteAudioFile = (filename) => {
  const audioFilename = `${path.parse(filename).name}.mp3`;
  const filePath = path.join(config.AUDIO_DIRECTORY, audioFilename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`음성 파일 삭제 완료: ${audioFilename}`);
  }
};

module.exports = { synthesizeSpeech, deleteAudioFile };