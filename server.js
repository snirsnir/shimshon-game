const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = 3000;

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ שגיאה: לא נמצא OPENAI_API_KEY בקובץ .env');
  console.log('📝 צור קובץ .env עם: OPENAI_API_KEY=המפתח_שלך');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log('✅ OpenAI מוכן עם מפתח:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // לשרת את קובץ ה-HTML

// API endpoint לבדיקת תשובות
app.post('/api/evaluate', async (req, res) => {
  try {
    const { task, answer } = req.body;
    
    if (!answer || answer.trim().length < 5) {
      return res.json({
        success: false,
        feedback: 'מר פנחס צריך תשובה יותר מפורטת! נסה שוב.',
        details: 'התשובה קצרה מדי'
      });
    }

    const prompt = `אתה בודק תשובות במשחק חינוכי. המשתמש צריך לעזור לדמות בשם "מר פנחס נחליאלי" - מנהל מיושן שמתנגד לטכנולוגיה.

המשימה: ${task.description}

קריטריונים להצלחה: ${task.criteria}

תשובת המשתמש: "${answer}"

בדוק אם התשובה:
1. עונה על הדרישות של המשימה
2. מכילה את האלמנטים הנדרשים
3. מעשית וריאליסטית
4. מפורטת מספיק

אם התשובה טובה - תן משוב חיובי בסגנון של מר פנחס שמתחיל להבין את הערך של AI.
אם התשובה לא טובה - תן הסבר בסגנון של מר פנחס שעדיין מבולבל.

החזר JSON בלבד בפורמט הזה:
{
  "success": true/false,
  "feedback": "הודעה במקסימום 150 מילים",
  "details": "הסבר קצר מה עבד או מה לא עבד"
}`;

    console.log(`🔍 Evaluating answer for task: ${task.title}`);
    console.log(`📝 Answer length: ${answer.length} characters`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "אתה בודק תשובות במשחק חינוכי. החזר רק JSON תקין בפורמט: {\"success\": true/false, \"feedback\": \"הודעה\", \"details\": \"פרטים\"}"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 250,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const aiResponse = completion.choices[0].message.content;
    console.log(`🤖 AI Response:`, aiResponse);
    
    // נסה לפרסר את תגובת ה-AI
    let result;
    try {
      result = JSON.parse(aiResponse);
      
      // וודא שיש את השדות הנדרשים
      if (!result.hasOwnProperty('success') || !result.feedback) {
        throw new Error('Missing required fields');
      }
      
      console.log(`✅ Parsed result:`, result);
    } catch (e) {
      console.log(`❌ JSON Parse Error:`, e.message);
      console.log(`🔧 Raw AI response:`, aiResponse);
      
      // אם יש בעיה בפרסור, תן תשובה ברירת מחדל
      const isGoodAnswer = answer.length > 50 && answer.includes(' ');
      result = {
        success: isGoodAnswer,
        feedback: isGoodAnswer 
          ? "🎉 מר פנחס: 'התשובה נראית סבירה, אמשיך לחקור את הנושא הזה...'"
          : "🤔 מר פנחס: 'אני צריך יותר פרטים כדי להבין מה אתה מתכוון.'",
        details: "בדיקה אוטומטית - AI לא זמין"
      };
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Error evaluating answer:', error);
    
    // בדיקת סוגי שגיאות שונים
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({
        success: false,
        feedback: 'מר פנחס: "נגמר לי הקרדיט במחשב! צריך לטעון עוד כסף..."',
        details: 'אין מספיק קרדיט ב-OpenAI'
      });
    }
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        success: false,
        feedback: 'מר פנחס: "המפתח של המחשב לא עובד... מה עשיתם לו?"',
        details: 'מפתח API לא תקין'
      });
    }
    
    res.status(500).json({
      success: false,
      feedback: 'מר פנחס: "המחשב שלי קרס שוב! נסה שוב בעוד רגע."',
      details: `שגיאת שרת: ${error.message}`
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'מר פנחס מוכן לעבודה!' });
});

app.listen(port, () => {
  console.log(`🎯 שרת מר פנחס רץ על http://localhost:${port}`);
  console.log('📝 לא לשכוח לשים את ה-API key בקובץ .env!');
});
