# 그림나래 (Image-to-Story)

OpenAI GPT-4o API를 활용한 AI 기반 동화 생성 플랫폼의 백엔드 서버입니다.

사용자가 이미지를 업로드하면 AI가 이미지 속 주요 객체를 분석하고,  
이를 기반으로 창의적인 동화를 자동으로 생성합니다.  
생성된 동화는 저장하고 언제든지 다시 조회할 수 있습니다.

---

## 주요 기능

- 사용자 회원가입 / 로그인 / 아이디 중복 확인
- JWT 기반 인증 (Access Token + Refresh Token)
- 이미지 업로드 및 AI 동화 자동 생성
- Google Cloud TTS 음성 낭독 생성 (남/여 선택) 및 미리듣기
- 동화 저장, 목록 조회, 상세 조회, 삭제

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Runtime | Node.js (v16+) |
| Framework | Express (v4.x) |
| Database | MySQL (v8+) + Sequelize ORM |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| AI | OpenAI GPT-4o-mini |
| TTS | Google Cloud Text-to-Speech API |
| File Upload | Multer (디스크 스토리지) |

---

## 프로젝트 구조

```
image-to-story-node/
├── app.js                  # 서버 엔트리포인트
├── config/
│   ├── database.js         # Sequelize DB 연결 설정
│   └── env.js              # 환경변수 관리
├── controllers/
│   ├── authController.js   # 회원가입, 로그인, 토큰 재발급, 로그아웃
│   └── imageController.js  # 이미지 업로드, 동화 생성/저장/조회/삭제
├── middlewares/
│   ├── authMiddleware.js   # JWT Access Token 검증
│   └── rateLimit.js        # API별 요청 횟수 제한
├── models/
│   ├── index.js            # 모델 초기화 및 관계 설정
│   ├── user.js
│   ├── image.js
│   ├── story.js
│   └── refreshToken.js
├── routes/
│   ├── index.js            # 라우트 통합
│   ├── authRoutes.js
│   └── imageRoutes.js
├── services/
│   ├── openaiService.js    # OpenAI API 호출
│   ├── ttsService.js       # Google Cloud TTS 호출
│   └── tokenService.js     # JWT 발급/검증/폐기
├── images/                 # 업로드된 이미지 저장
├── audios/                 # TTS 음성 파일 저장
├── .env
├── .env.example
└── package.json
```

---

## API 엔드포인트

| 구분 | 메서드 | 엔드포인트 | 인증 | 설명 |
|------|--------|-----------|:----:|------|
| 인증 | POST | `/check-duplicate` | ❌ | 아이디 중복 확인 |
| 인증 | POST | `/signup` | ❌ | 회원가입 |
| 인증 | POST | `/login` | ❌ | 로그인 |
| 인증 | POST | `/refresh` | ❌ | Access Token 재발급 |
| 인증 | POST | `/logout` | ❌ | 로그아웃 |
| 동화 | POST | `/image-upload` | ✅ | 이미지 업로드 + AI 동화 생성 (미저장) |
| 동화 | POST | `/story-save` | ✅ | 동화 및 이미지 저장 확정 |
| 동화 | POST | `/tts-preview` | ✅ | TTS 미리듣기 (스트리밍, 저장 없음) |
| 동화 | GET | `/stories/:user_id` | ✅ | 동화 목록 조회 |
| 동화 | GET | `/story/:story_id` | ✅ | 동화 상세 조회 |
| 동화 | DELETE | `/story/:story_id` | ✅ | 동화 + 이미지 + 음성 삭제 |

> **동화 생성 흐름**: `/image-upload`로 AI 동화를 미리보기한 후, 사용자가 확인하면 `/story-save`로 실제 저장합니다.

---

## 데이터베이스 구조

### users
```sql
user_id   INT PRIMARY KEY AUTO_INCREMENT
username  VARCHAR(50) UNIQUE NOT NULL
name      VARCHAR(50) NOT NULL
password  VARCHAR(128) NOT NULL  -- bcrypt 해싱
email     VARCHAR(100) UNIQUE
```

### images
```sql
image_id           INT PRIMARY KEY AUTO_INCREMENT
user_id            INT NOT NULL  -- FK → users.user_id
original_filename  VARCHAR(255) NOT NULL
image_url          VARCHAR(255)
image_description  TEXT
```

### stories
```sql
story_id       INT PRIMARY KEY AUTO_INCREMENT
filename       VARCHAR(255) UNIQUE NOT NULL
story_name     VARCHAR(255) NOT NULL
story_content  TEXT NOT NULL
image_id       INT NOT NULL  -- FK → images.image_id
user_id        INT NOT NULL  -- FK → users.user_id
audio_url      VARCHAR(255)  -- TTS 실패 시 NULL
created_at     DATETIME NOT NULL DEFAULT NOW()
```

### refresh_tokens
```sql
id         INT PRIMARY KEY AUTO_INCREMENT
user_id    INT NOT NULL  -- FK → users.user_id
token      VARCHAR(512) UNIQUE NOT NULL
expires_at DATETIME NOT NULL
```

---

## 설치 및 실행

### 1. MySQL 데이터베이스 생성
```sql
CREATE DATABASE image_to_story;
```

### 2. 환경변수 설정
```bash
cp .env.example .env
```

`.env` 설정 예시:
```env
PORT=3000
DATABASE_URL=mysql://root:password@localhost:3306/image_to_story
OPENAI_API_KEY=your_openai_api_key
UPLOAD_DIRECTORY=images
AUDIO_DIRECTORY=audios
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
BASE_URL=http://localhost:3000

# Google Cloud TTS
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

### 3. 설치 및 실행
```bash
npm install
npm run dev   # 개발 모드 (nodemon)
npm start     # 프로덕션 모드
```

정상 실행 시 출력:
```
DB 연결 성공
서버가 포트 3000에서 실행 중입니다.
```

> Sequelize `sync()`가 자동으로 테이블을 생성하므로 별도 마이그레이션은 불필요합니다.  
> `images/`, `audios/` 디렉토리는 서버 시작 시 자동으로 생성됩니다.

---

## 보안

| 항목 | 정책 |
|------|------|
| 비밀번호 | bcryptjs (Salt Rounds: 10) 해싱 |
| 인증 | Access Token 15분 + Refresh Token 7일 (httpOnly 쿠키) |
| 토큰 정책 | 1인 1 Refresh Token (로그인 시 기존 토큰 교체) |
| 파일 업로드 | 최대 10MB, jpeg/jpg/png/gif만 허용 |
| CORS | 허용된 오리진만 접근 가능 |

### Rate Limiting

| 엔드포인트 | 기준 | 제한 |
|-----------|------|------|
| 동화 생성 (`/image-upload`) | IP | 1시간 5회 (전역) / user+IP 1시간 3회 |
| 동화 저장 (`/story-save`) | user+IP | 1시간 5회 |
| TTS 미리듣기 (`/tts-preview`) | IP | 1시간 5회 (전역) / user+IP 1시간 3회 |
| 로그인 (`/login`) | IP | 1시간 5회 |
| 회원가입 (`/signup`) | IP | 1시간 3회 |

---

## AI 동화 생성 프로세스

1. 사용자가 이미지 파일 업로드
2. 서버에서 이미지를 Base64로 인코딩
3. OpenAI GPT-4o-mini에 분석 요청
4. AI가 이미지에서 주요 객체 3개 식별
5. 식별된 객체를 중심으로 500자 분량 동화 생성
6. 제목과 내용 파싱 후 클라이언트에 반환
7. 사용자 확인 후 저장 요청 시 이미지·동화를 DB에 저장하고 Google Cloud TTS로 음성 파일 생성

---

## 저장소

- **백엔드 (Node.js)** — 현재 저장소
- **프론트엔드 (React)** — https://github.com/HeoSeonJin0504/image-to-story-front.git