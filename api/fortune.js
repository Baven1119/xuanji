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

    const prompt = `你是一位專業的紫微斗數命理師，請根據以下命盤資料，用繁體中文回答命主的問題。

命主姓名：${name || '命主'}
性別：${genderStr}
出生日期：${birthDate}
五行局：${astrolabe.fiveElementsClass || ''}
命宮：${astrolabe.soulPalace?.name || ''}
身宮：${astrolabe.bodyPalace?.name || ''}

各宮星曜：
${palaces.map(p => `${p.name}：${[...p.majorStars, ...p.minorStars].join('、') || '（無主星）'}`).join('\n')}

流年宮位（今年）：
${yearlyPalaces.map(p => `${p.name}：${p.majorStars.join('、') || '無'}`).join('\n')}

命主想了解：2026年的${questionLabel}

請重點分析${focusPalace}的星曜組合，結合流年運勢，給出具體解析。
格式：先總體概述2-3句，再分2-3個面向分析，最後給1個具體建議。語氣像命理師但白話易懂，約200-300字。`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
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
