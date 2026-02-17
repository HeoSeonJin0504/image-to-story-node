# 그림나래 (Image-to-Story)
OpenAI GPT-4o Vision API를 활용한  
AI 기반 동화 생성 플랫폼의 백엔드 서버입니다.

사용자가 이미지를 업로드하면 AI가 이미지 속 주요 객체를 분석하고,  
이를 기반으로 창의적인 동화를 자동으로 생성합니다.  
생성된 동화는 저장하고 언제든지 다시 조회할 수 있습니다.

### 주요 기능
- 사용자 회원가입 / 로그인 / 아이디 중복 확인
- JWT 기반 인증 (Access Token + Refresh Token)
- 이미지 업로드 및 AI 동화 자동 생성
- 동화 저장, 목록 조회, 상세 조회, 삭제

## 🛠️ 기술 스택
- **Runtime**: Node.js (v16+)
- **Framework**: Express (v4.x)
- **Database**: MySQL (v8+) + Sequelize ORM
- **Auth**: JWT (jsonwebtoken + bcrypt)
- **AI**: OpenAI GPT-4o Vision API
- **File Upload**: Multer (메모리 스토리지)

## 📁 프로젝트 구조
```
image-to-story-node/
├── app.js                  # 서버 엔트리포인트
├── config/
│   ├── database.js         # Sequelize DB 연결 설정
│   └── env.js              # 환경변수 관리 및 유효성 검증
├── controllers/
│   ├── authController.js   # 회원가입, 로그인, 토큰 재발급, 로그아웃
│   └── imageController.js  # 이미지 업로드, 동화 생성/저장/조회/삭제
├── middlewares/
│   └── authMiddleware.js   # JWT Access Token 검증 미들웨어
├── models/
│   ├── index.js            # 모델 초기화 및 관계 설정
│   ├── user.js             # 사용자 모델
│   ├── image.js            # 이미지 모델
│   ├── story.js            # 동화 모델
│   └── refreshToken.js     # Refresh Token 모델
├── routes/
│   ├── index.js            # 라우트 통합
│   ├── authRoutes.js       # 인증 라우트
│   └── imageRoutes.js      # 이미지 및 동화 라우트
├── services/
│   ├── openaiService.js    # OpenAI API 호출 로직
│   └── tokenService.js     # JWT 발급/검증/폐기 로직
├── images/                 # 업로드된 이미지 저장 디렉토리
├── .env                    # 환경변수 (Git 제외)
├── .env.example            # 환경변수 예시 파일
└── package.json
```

## 📚 API 엔드포인트
| 구분 | 메서드 | 엔드포인트 | 인증 필요 | 설명 |
|------|--------|-----------|:---------:|------|
| 인증 | POST | `/check-duplicate` | ❌ | 아이디 중복 확인 |
| 인증 | POST | `/signup` | ❌ | 회원가입 |
| 인증 | POST | `/login` | ❌ | 로그인 |
| 인증 | POST | `/refresh` | ❌ | Access Token 재발급 |
| 인증 | POST | `/logout` | ❌ | 로그아웃 |
| 동화 | POST | `/image-upload` | ✅ | 이미지 업로드 + AI 동화 생성 (미저장) |
| 동화 | POST | `/story-save` | ✅ | 동화 및 이미지 DB 저장 확정 |
| 동화 | GET | `/stories/:user_id` | ✅ | 동화 목록 조회 |
| 동화 | GET | `/story/:story_id` | ✅ | 동화 상세 조회 |
| 동화 | DELETE | `/story/:story_id` | ✅ | 동화 + 이미지 삭제 |

> **동화 생성 흐름**: `/image-upload`로 먼저 AI 동화를 미리보기한 후, 사용자가 확인하면 `/story-save`로 실제 저장합니다.

## 🗄️ 데이터베이스 구조
### users (사용자)
```sql
user_id   INT PRIMARY KEY AUTO_INCREMENT
username  VARCHAR(50) UNIQUE NOT NULL
name      VARCHAR(50) NOT NULL
password  VARCHAR(128) NOT NULL  -- bcrypt 해싱
email     VARCHAR(100) UNIQUE
```

### images (이미지)
```sql
image_id           INT PRIMARY KEY AUTO_INCREMENT
user_id            INT NOT NULL  -- FK → users.user_id
original_filename  VARCHAR(255) NOT NULL
image_url          VARCHAR(255)
image_description  TEXT
```

### stories (동화)
```sql
story_id       INT PRIMARY KEY AUTO_INCREMENT
filename       VARCHAR(255) UNIQUE NOT NULL
story_name     VARCHAR(255) NOT NULL
story_content  TEXT NOT NULL
image_id       INT NOT NULL  -- FK → images.image_id
user_id        INT NOT NULL  -- FK → users.user_id
created_at     DATETIME NOT NULL DEFAULT NOW()
```

### refresh_tokens (리프레시 토큰)
```sql
id         INT PRIMARY KEY AUTO_INCREMENT
user_id    INT NOT NULL  -- FK → users.user_id
token      VARCHAR(512) UNIQUE NOT NULL
expires_at DATETIME NOT NULL
```

## 🚀 설치 및 실행

### 1. MySQL 데이터베이스 생성
```sql
CREATE DATABASE image_to_story;
```

### 2. 환경변수 설정
`.env.example` 파일을 참고하여 `.env` 파일을 생성합니다.
```bash
cp .env.example .env
# .env 파일을 열어 각 항목 설정
```

`.env` 설정 예시:
```env
PORT=3000
DATABASE_URL=mysql://root:password@localhost:3306/image_to_story
OPENAI_API_KEY=your_openai_api_key
UPLOAD_DIRECTORY=images
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
```

### 3. 의존성 설치 및 실행
```bash
npm install
npm run dev   # 개발 모드 (nodemon 자동 재시작)
npm start     # 프로덕션 모드
```

서버가 정상적으로 실행되면 다음 메시지가 출력됩니다:
```
DB 연결 성공
서버가 포트 3000에서 실행 중입니다.
```

> Sequelize `sync()`가 자동으로 테이블을 생성하므로 별도 마이그레이션은 불필요합니다.

### 주의사항
- OpenAI API 키는 유료 사용량에 따라 과금됩니다
- `.env` 파일은 절대 Git에 커밋하지 마세요
- `images/` 디렉토리가 없는 경우 미리 생성해두세요 (`mkdir images`)

## 🔒 보안
- **비밀번호**: bcrypt (Salt Rounds: 10) 해싱 저장
- **인증**: JWT Access Token (15분) + Refresh Token (7일, httpOnly 쿠키)
- **토큰 정책**: 1인 1 Refresh Token (로그인 시 기존 토큰 교체)
- **파일 업로드**: 최대 10MB, jpeg/jpg/png/gif만 허용
- **CORS**: 허용된 오리진만 접근 가능

## AI 동화 생성 프로세스
1. 사용자가 이미지 파일 업로드
2. 서버에서 이미지를 Base64로 인코딩
3. OpenAI GPT-4o-mini Vision API에 분석 요청
4. AI가 이미지에서 주요 객체 3개 식별
5. 식별된 객체를 중심으로 500자 분량 동화 생성
6. 제목과 내용 파싱 후 클라이언트에 반환
7. 사용자 확인 후 저장 요청 시 이미지와 동화를 DB에 저장

## 저장소
본 프로젝트는 2개의 저장소로 구성되어 있습니다:

- **백엔드 (Node.js)** - 현재 저장소

- **프론트엔드 (React)**
  - https://github.com/HeoSeonJin0504/image-to-story-front.git