import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import config from '../config/env.js';

// TTS 클라이언트 생성 (Base64 방식 우선, 파일 경로 방식 fallback)
const createTTSClient = () => {
  try {
    if (process.env.GOOGLE_TTS_CREDENTIALS_BASE64) {
      const json = Buffer.from(process.env.GOOGLE_TTS_CREDENTIALS_BASE64, 'base64').toString('utf8');
      const credentials = JSON.parse(json);
      return new textToSpeech.TextToSpeechClient({ credentials });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return new textToSpeech.TextToSpeechClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });
    } else {
      console.warn('Google TTS 인증 정보가 없습니다. TTS 기능이 비활성화됩니다.');
      return null;
    }
  } catch (error) {
    console.error('Google TTS 클라이언트 생성 실패:', error.message);
    return null;
  }
};

const client = createTTSClient();

// 지원하는 목소리 목록
// ko-KR Neural2 성별: A(여성), B(여성), C(남성)
const VOICE_MAP = {
  FEMALE: { name: 'ko-KR-Neural2-A', ssmlGender: 'FEMALE' },
  MALE:   { name: 'ko-KR-Neural2-C', ssmlGender: 'MALE' },
};

/**
 * 동화 텍스트를 mp3로 변환 후 로컬 디스크에 저장
 * @param {string} text - 변환할 텍스트 (동화 내용)
 * @param {string} filename - 기준 파일명 (이미지와 동일한 이름 사용, 확장자 무관)
 * @param {string} gender - 목소리 선택 ('MALE' | 'FEMALE'), 기본값 FEMALE
 * @returns {Promise<string>} - 오디오 파일 공개 URL
 */
export const synthesizeSpeech = async (text, filename, gender = 'FEMALE') => {
  if (!client) throw new Error('TTS 서비스가 비활성화되어 있습니다. Google TTS 인증 정보를 확인하세요.');

  const voice = VOICE_MAP[gender] ?? VOICE_MAP['FEMALE'];

  const request = {
    input: { text },
    voice: {
      languageCode: 'ko-KR',
      name: voice.name,
      ssmlGender: voice.ssmlGender,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.9,
      pitch: 0,
    },
  };

  const [response] = await client.synthesizeSpeech(request);

  const audioFilename = `${path.parse(filename).name}.mp3`;
  const audioPath = path.join(config.AUDIO_DIRECTORY, audioFilename);

  // 오디오 디렉토리 없으면 생성
  if (!fs.existsSync(config.AUDIO_DIRECTORY)) {
    fs.mkdirSync(config.AUDIO_DIRECTORY, { recursive: true });
  }

  fs.writeFileSync(audioPath, response.audioContent, 'binary');

  return `${config.BASE_URL}/audios/${audioFilename}`;
};

/**
 * 미리듣기용 TTS — 디스크 저장 없이 Buffer 반환
 * @param {string} text - 변환할 텍스트
 * @param {string} gender - 목소리 선택 ('MALE' | 'FEMALE'), 기본값 FEMALE
 * @returns {Promise<Buffer>} - mp3 오디오 버퍼
 */
export const synthesizeSpeechPreview = async (text, gender = 'FEMALE') => {
  if (!client) throw new Error('TTS 서비스가 비활성화되어 있습니다. Google TTS 인증 정보를 확인하세요.');

  const voice = VOICE_MAP[gender] ?? VOICE_MAP['FEMALE'];

  const request = {
    input: { text },
    voice: {
      languageCode: 'ko-KR',
      name: voice.name,
      ssmlGender: voice.ssmlGender,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.9,
      pitch: 0,
    },
  };

  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent;
};

/**
 * 로컬 오디오 파일 삭제
 * @param {string} audioFilename - 삭제할 mp3 파일명
 */
export const deleteAudioFile = (audioFilename) => {
  const audioPath = path.join(config.AUDIO_DIRECTORY, audioFilename);
  fs.unlink(audioPath, (err) => {
    if (err) console.error(`오디오 파일 삭제 실패: ${audioPath}`, err.message);
  });
};