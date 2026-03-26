const { astro } = require('iztro');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { birthDate, timeIndex, gender, question, name } = req.body;

  if (!birthDate || timeIndex === undefined || !gender || !question) {
    return res.status(400).json({ error: '缺少必要資料' });
  }

  try {
    const genderStr = gender === '男' ? '男' : '女';
    const astrolabe = astro.bySolar(birthDate, parseInt(timeIndex), genderStr, true, 'zh-TW');

    const palaces = astrolabe.palaces.map(p => ({
      name: p.name,
      majorStars: p.majorStars.map(s => s.name),
      minorStars: p.minorStars.map(s => s.name),
    }));

    const horoscope = astrolabe.horoscope(new Date());
    const yearlyPalaces = horoscope.yearly?.palaces?.map(p => ({
      name: p.name,
      majorStars: p.majorStars?.map(s => s.name) || [],
    })) || [];

    const questionMap = {
      wealth: '財帛宮',
      love: '夫妻宮',
      health: '疾厄宮',
      overall: '命宮',
    };
    const focusPalace = questionMap[question] || '命宮';
    const questionLabel = {
      wealth: '財運',
      love: '異性緣',
      health: '健康運',
      overall: '總運勢',
    }[question] || '總運勢';

    const prompt = `你是一位學識淵博、經驗豐富的紫微斗數命理師，擅長以深入淺出的方式為命主解盤。請根據以下命盤資料，撰寫一份詳盡的命理分析報告，全文須達1000字以上，以繁體中文書寫。

【命主資料】
姓名：${name || '命主'}
性別：${genderStr}
出生日期：${birthDate}
五行局：${astrolabe.fiveElementsClass || ''}
命宮所在：${astrolabe.soulPalace?.name || ''}
身宮所在：${astrolabe.bodyPalace?.name || ''}

【十二宮星曜分佈】
${palaces.map(p => `${p.name}：${[...p.majorStars, ...p.minorStars].join('、') || '（無主星）'}`).join('\n')}

【2026年流年宮位】
${yearlyPalaces.map(p => `${p.name}：${p.majorStars.join('、') || '無'}`).join('\n')}

【命主提問】2026年的${questionLabel}

---

請依照以下四個段落結構撰寫報告：

第一段【命格總論與性格分析】
根據命宮主星、五行局、身宮，深入分析命主的主命格。說明此命格的特質、天賦與性格傾向，包括處事風格、人際關係、思維模式、優勢與需要注意的盲點。字數約250-300字。

第二段【${questionLabel}深度解析】
針對命主的提問，重點分析${focusPalace}的星曜組合，並結合2026年流年運勢，給出具體且深入的解析。說明今年的機遇、挑戰、關鍵時機（哪幾個月特別重要）。字數約350-400字。

第三段【整體運勢連動分析】
說明${questionLabel}如何與命主其他宮位產生互動影響，從整體命盤的角度給出更全面的觀點。字數約200字。

第四段【具體行動建議】
根據以上分析，給予命主至少5條具體、可執行的建議，每條建議說明原因與做法。字數約200字。

---

撰寫要求：
- 全文總字數必須達到1000字以上
- 語氣專業但親切，像一位真正的命理師在為命主解盤
- 避免過於籠統，每個論點都要結合具體星曜說明
- 段落之間要有自然的過渡
- 不要使用 Markdown 符號（如 ** # 等），直接用文字段落呈現`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json();

    if (claudeData.error) {
      console.error('Claude error:', JSON.stringify(claudeData.error));
      return res.status(500).json({ error: '命盤解析失敗：' + claudeData.error.message });
    }

    const resultText = claudeData.content?.[0]?.text || '命盤解析暫時無法取得，請稍後再試。';
    return res.status(200).json({ result: resultText });

  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: '命盤推算失敗：' + err.message });
  }
};
