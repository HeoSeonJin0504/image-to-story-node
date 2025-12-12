# 그림나래(Image-to-Story-node)

그림나래(Image-to-Story-node)는 업로드된 이미지를 분석하여 창의적인 동화를 생성해주는 서비스의 **백엔드 서버(Node.js)**입니다.

## 프로젝트 개요

사용자가 이미지를 업로드하면 OpenAI ChatGPT API가 이미지를 분석하여 주요 객체를 식별하고, 이를 기반으로 창의적인 동화를 자동으로 생성합니다.
사용자는 생성된 동화와 이미지를 저장하고 관리할 수 있습니다.

### 본 프로젝트 주요 기능

- **사용자 인증**: 회원가입, 로그인, 아이디 중복 확인
- **이미지 업로드**: 이미지 파일 업로드 및 저장
- **AI 동화 생성**: OpenAI API를 통한 이미지 분석 및 동화 자동 생성
- **데이터 관리**: 이미지, 이미지 정보, 동화 저장 및 조회

## 🛠️ 기술 스택

### Core
- **Node.js** (v16+) - 서버 런타임
- **Express** (v4.21.2) - 웹 프레임워크

### Database & ORM
- **MySQL** (v8+) - 관계형 데이터베이스
- **Sequelize** (v6.37.5) - ORM (Object-Relational Mapping)
- **mysql2** (v3.11.5) - MySQL 드라이버

### AI & File Upload
- **OpenAI** (v4.85.0) - GPT-4 Vision API를 통한 이미지 분석 및 동화 생성
- **Multer** (v1.4.5-lts.1) - 파일 업로드 처리

### Security & Middleware
- **bcrypt** (v5.1.1) - 비밀번호 해싱
- **cors** (v2.8.5) - Cross-Origin Resource Sharing 처리

### Utilities
- **dotenv** (v16.4.7) - 환경 변수 관리

### Development
- **nodemon** (v3.1.9) - 개발 서버 자동 재시작

## 📁 프로젝트 구조

```
image-to-story-node/
├── config/              # 설정 파일
│   ├── database.js     # Sequelize 데이터베이스 연결
│   └── env.js          # 환경 변수 관리
├── controllers/         # 요청 처리 로직
│   ├── authController.js       # 인증 관련 컨트롤러
│   └── imageController.js      # 이미지 업로드 및 동화 생성
├── models/              # Sequelize 모델
│   ├── index.js        # 모델 초기화 및 관계 설정
│   ├── user.js         # 사용자 모델
│   ├── image.js        # 이미지 모델
│   ├── imageInfo.js    # 이미지 정보 모델
│   └── story.js        # 동화 모델
├── routes/              # API 라우트 정의
│   ├── index.js        # 라우트 통합
│   ├── authRoutes.js   # 인증 라우트
│   └── imageRoutes.js  # 이미지 업로드 라우트
├── services/            # 외부 서비스 연동
│   └── openaiService.js        # OpenAI API 호출
├── images/              # 업로드된 이미지 저장 디렉토리
├── .env                 # 환경 변수
├── app.js               # Express 앱 초기화 및 설정
└── package.json         # 프로젝트 의존성
```

## API 엔드포인트

### 인증 (Authentication)
- `POST /check-duplicate` - 아이디 중복 확인
  - Request Body: `{ "username": "string" }`
  - Response: `{ "exists": boolean }`

- `POST /login` - 로그인
  - Request Body: `{ "username": "string", "password": "string" }`
  - Response: `{ "user_id": number, "name": "string" }`

- `POST /signup` - 회원가입
  - Request Body: `{ "username": "string", "name": "string", "password": "string", "email": "string" }`
  - Response: `{ "user_id": number }`

### 이미지 & 동화 (Image & Story)
- `POST /image-upload` - 이미지 업로드 및 동화 생성
  - Request: `multipart/form-data`
    - `file`: 이미지 파일 (jpeg, jpg, png, gif)
    - `user_id`: 사용자 ID
  - Response: 
    ```json
    {
      "filename": "string",
      "story_name": "string",
      "story_content": "string",
      "image_url": "string"
    }
    ```

## 데이터베이스 구조

### users (사용자)
```sql
user_id        INT PRIMARY KEY AUTO_INCREMENT
username       VARCHAR(50) UNIQUE NOT NULL
name           VARCHAR(50) NOT NULL
password       VARCHAR(128) NOT NULL
email          VARCHAR(100) UNIQUE
```

### images (이미지)
```sql
image_id            INT PRIMARY KEY AUTO_INCREMENT
user_id             INT NOT NULL (FK -> users.user_id)
original_filename   VARCHAR(255) NOT NULL
```

### image_info (이미지 정보)
```sql
image_info_id      INT PRIMARY KEY AUTO_INCREMENT
image_id           INT NOT NULL (FK -> images.image_id)
image_url          VARCHAR(255)
image_description  TEXT
```

### stories (동화)
```sql
story_id        INT PRIMARY KEY AUTO_INCREMENT
filename        VARCHAR(255) UNIQUE NOT NULL
story_name      VARCHAR(255) NOT NULL
story_content   TEXT NOT NULL
image_id        INT NOT NULL (FK -> images.image_id)
user_id         INT NOT NULL (FK -> users.user_id)
```

## 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 설정하세요:

```env
# 서버 포트 설정
PORT=3000

# 데이터베이스 연결 URL (MySQL)
# 형식: mysql://username:password@host:port/database
DATABASE_URL=mysql://root:password@localhost:3306/image_to_story

# OpenAI API 키
OPENAI_API_KEY=openai_api_입력

# 이미지 업로드 디렉토리
UPLOAD_DIRECTORY=images

# CORS 허용 오리진 (쉼표로 구분)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## 설치 및 실행

### 1. 저장소 클론
```bash
git clone <repository-url>
cd image-to-story-node
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env` 파일을 생성하고 위의 환경 변수를 설정합니다.

### 4. MySQL 데이터베이스 설정
MySQL 서버를 실행하고 데이터베이스를 생성합니다:

```sql
CREATE DATABASE image_to_story;
```

Sequelize가 자동으로 테이블을 생성합니다.

### 5. 이미지 업로드 디렉토리 생성
```bash
mkdir images
```

### 6. 서버 실행

**개발 모드** (자동 재시작)
```bash
npm run dev
```

**프로덕션 모드**
```bash
npm start
```

## 🔒 보안 기능

- **비밀번호 보안**: bcrypt를 사용한 해싱 (Salt Rounds: 10)
- **파일 업로드 제한**: 
  - 최대 파일 크기: 10MB
  - 허용 파일 형식: jpeg, jpg, png, gif
- **입력값 검증**: 필수 필드 검증
- **CORS 설정**: 허용된 도메인만 접근 가능

## AI 동화 생성 프로세스

1. 사용자가 이미지를 업로드
2. 이미지를 Base64로 인코딩
3. OpenAI GPT-4 Vision API에 이미지 분석 요청
4. AI가 이미지에서 주요 객체 3개를 식별
5. 식별된 객체를 바탕으로 500자 분량의 동화 자동 생성
6. 생성된 동화를 데이터베이스에 저장

### 동화 생성 프롬프트
```
1. 이미지의 내용을 간결하고 명확하게 묘사
2. 이미지에서 주요한 객체 3개를 식별하고, 각 객체를 간략히 설명
3. 식별된 3개의 객체를 중심으로 창의적이고 감동적인 500자 분량의 동화 작성
4. 출력 형식: {객체1, 객체2, 객체3, 동화 제목: '제목', 동화 내용: '내용'}
```

## 개발
본 프로젝트는 **Claude Sonnet 4.5** AI를 활용하여 코드 작성, 리팩토링 작업을 수행했습니다.

## 저장소
본 프로젝트는 2개의 저장소로 구성되어 있습니다:

- **백엔드 (Node.js)** - 현재 저장소
  
- **프론트엔드 (React)** 
  - https://github.com/HeoSeonJin0504/image-to-story-front.git