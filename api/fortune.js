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

    const prompt = `你是一位學識淵博、經驗豐富的紫微斗數命理師。請根據以下命盤資料，撰寫一份詳盡的命理分析報告，全文須達1500字以上，以繁體中文書寫。

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

請依照以下三個段落結構撰寫報告，使用 HTML 格式輸出（因為報告會直接顯示在網頁上）：

【第一段：命主命格分析】
分析命主的命宮主星組合，若有特定格局名稱（如將星得地格、紫府同宮格、日月並明格等），請用以下 HTML 格式呈現格局名稱：
<div class="highlight-title">格局名稱</div>
接著詳細描述：
- 命宮主星的特質與意義
- 五行局對命主的影響
- 身宮的輔助特質
- 命主的性格傾向、天賦才能、處事風格
- 人際關係模式與優勢
- 需要注意的性格盲點
此段字數須達500字以上，描述要宏觀且深入。

【第二段：2026年${questionLabel}深度解析 + 2030年收入預測】
首先針對命主的提問，分析${focusPalace}的星曜組合與2026年流年互動，給出具體解析（300字）。

接著進行收入預測，必須根據命主出生日期計算實際年齡，嚴格遵守以下規定：
- 未滿20歲：年收入上限100萬台幣
- 未滿25歲：年收入上限200萬台幣
- 未滿30歲：年收入上限350萬台幣
- 30歲以上：根據命盤與台灣市場合理推算

預測2030年台幣年收入範圍，兩個數字相差不超過100萬，用以下格式呈現：
<div class="highlight-income">NT$ XXX萬 ～ NT$ XXX萬</div>
說明此收入預測的命盤依據，以及如何達到此收入的路徑。

【第三段：行為建議】
先用以下格式呈現總結核心建議：
<div class="highlight-summary">一句話總結命主今年最重要的行動方向</div>
接著給予以下五個面向的具體建議，每個面向至少100字：
1. 生活作息建議（根據命盤特質）
2. 適合產業建議（具體說明為何適合）
3. 職務方向建議（具體職稱或角色）
4. 身上飾品建議（根據五行與命格，說明材質、顏色、佩戴位置與原因）
5. 今年特別注意事項

---

【嚴格規定】
1. 全文總字數必須達到1500字以上
2. 只能使用上述指定的 HTML 標籤，其餘內容全部用純文字段落
3. 禁止使用 ** # - * 等 Markdown 符號
4. 每個論點必須結合具體星曜名稱
5. 收入數字必須合理，符合台灣市場行情
6. 格局名稱若不確定則不要亂寫，寧可描述星曜組合特質`;

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
