const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

// --- 1. DATABASE CONNECTION (Serverless Optimized) ---
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
  }
};

// --- 2. CORS CONFIGURATION ---
const corsOptions = {
  origin: ['https://edu-hack-tech.vercel.app', 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
};

// --- 3. MIDDLEWARES ---
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(helmet());
app.use(morgan('dev'));

// --- 4. DB MIDDLEWARE (ensures connection before routes) ---
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// --- 5. ROUTES ---
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'EduHackTech API is running!' });
});

app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/courses', require('./modules/learning/course.routes'));
app.use('/api/events', require('./modules/competition/event.routes'));
app.use('/api/enrollments', require('./modules/learning/enrollment.routes'));
app.use('/api/admin', require('./modules/admin/admin.routes'));
app.use('/api/challenges', require('./modules/competition/challenge.routes'));
app.use('/api/notifications', require('./modules/notification/notification.routes'));
app.use('/api/quiz', require('./modules/learning/quiz.routes'));
app.use('/api/ai', require('./modules/ai/ai.routes'));
app.use('/api/team-finder', require('./modules/competition/teamFinder.routes'));
app.use('/api/chat', require('./modules/competition/chat.routes'));
app.use('/api/refunds', require('./modules/learning/refund.routes'));

// --- 6. ERROR HANDLING ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server Error' });
});

// --- 7. SERVER ---
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;