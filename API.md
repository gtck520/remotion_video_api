# API Reference

## Base URL
`http://localhost:3005`

## Endpoints

### 1. Create Render Job
Submit a new video rendering task.

- **URL**: `/renders`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "compositionId": "IntroTitle",
  "inputProps": {
    "title": "Hello World",
    "subtitle": "Generated via API"
  }
}
```

#### Response
```json
{
  "jobId": "523f9756-d0c3-410f-9cad-182acd4c818e"
}
```

---

### 2. Get Job Status
Poll this endpoint to check progress and get the final video URL.

- **URL**: `/renders/:jobId`
- **Method**: `GET`

#### Response (In Progress)
```json
{
  "status": "in-progress",
  "progress": 0.45,
  "data": { ... }
}
```

#### Response (Completed)
```json
{
  "status": "completed",
  "videoUrl": "http://localhost:3005/renders/523f9756-d0c3-410f-9cad-182acd4c818e.mp4",
  "outputLocation": "/absolute/path/to/video.mp4"
}
```

---

### 3. Merge Videos
Combine multiple video clips into a single file.

- **URL**: `/merge`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "videoUrls": [
    "http://localhost:3005/renders/video1.mp4",
    "http://localhost:3005/renders/video2.mp4"
  ]
}
```

#### Response
```json
{
  "url": "http://localhost:3005/renders/merged-timestamp.mp4",
  "path": "/absolute/path/to/merged-timestamp.mp4"
}
```

---

### 4. Cancel Job
Stop a running render job.

- **URL**: `/renders/:jobId`
- **Method**: `DELETE`

---

## 🎨 Available Templates & Schemas

Use these `compositionId`s and `inputProps` when calling `POST /renders`.

### 1. `IntroTitle`
Simple title screen with spring animation.

**Props Schema**:
```typescript
{
  title: string;              // Main headline
  subtitle?: string;          // Optional sub-headline
  titleColor?: string;        // Hex color (e.g., "#000000")
  backgroundColor?: string;   // Hex color (e.g., "#ffffff")
  logoUrl?: string;           // URL to logo image
}
```

### 2. `KnowledgeCard`
Displays a list of bullet points, optionally with an image on the right.

**Props Schema**:
```typescript
{
  title: string;
  points: string[];           // Array of text points
  imageUrl?: string;          // Optional side image
  backgroundColor?: string;
  textColor?: string;
}
```

### 3. `Comparison`
Split screen comparing two concepts (Left vs Right).

**Props Schema**:
```typescript
{
  leftTitle: string;
  leftColor: string;
  leftPoints: string[];
  rightTitle: string;
  rightColor: string;
  rightPoints: string[];
  backgroundColor?: string;
}
```

### 4. `DataChart`
Animated bar chart for visualizing data.

**Props Schema**:
```typescript
{
  title: string;
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  backgroundColor?: string;
  textColor?: string;
}
```

### 5. `Gallery`
Grid layout showcasing multiple images.

**Props Schema**:
```typescript
{
  title: string;
  images: string[];           // Array of image URLs
  backgroundColor?: string;
  textColor?: string;
}
```
