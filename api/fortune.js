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

    const palaceMap = {
      wealth: '財帛宮',
      love: '夫妻宮',
      health: '疾厄宮',
      overall: '命宮',
    };
    const focusPalace = palaceMap[question] || '命宮';

    const baseInfo = `【命主資料】
姓名：${name || '命主'}
性別：${genderStr}
出生日期：${birthDate}
五行局：${astrolabe.fiveElementsClass || ''}
命宮所在：${astrolabe.soulPalace?.name || ''}
身宮所在：${astrolabe.bodyPalace?.name || ''}

【十二宮星曜分佈】
${palaces.map(p => `${p.name}：${[...p.majorStars, ...p.minorStars].join('、') || '（無主星）'}`).join('\n')}

【2026年流年宮位】
${yearlyPalaces.map(p => `${p.name}：${p.majorStars.join('、') || '無'}`).join('\n')}`;

    const commonRules = `【嚴格規定】
1. 全文總字數必須達到1500字以上，這是硬性要求
2. 只能使用上述指定的 HTML 標籤，其餘內容全部用純文字段落
3. 禁止使用 ** # - * 等 Markdown 符號
4. 每個論點必須結合具體星曜名稱，不可泛泛而談
5. 格局名稱若不確定則不要亂寫，寧可描述星曜組合特質
6. 語氣專業但親切，像一位命理師坐在命主面前解盤`;

    const commonFirstSection = `【第一段：命主命格分析】（此段字數須達500字以上）
分析命主的命宮主星組合，若有特定格局名稱（如將星得地格、紫府同宮格、日月並明格等），請用以下 HTML 格式呈現：
<div class="highlight-title">格局名稱</div>
詳細描述以下內容：
- 命宮主星的特質與深層意義
- 五行局對命主一生的影響
- 身宮的輔助特質
- 命主的性格傾向、天賦才能、處事風格
- 人際關係模式與優勢
- 需要注意的性格盲點與改善方向`;

    let secondSection = '';
    let thirdSection = '';

    if (question === 'wealth') {
      secondSection = `【第二段：人生財運深度解析 + 2030年收入預測】
首先深入分析財帛宮的星曜組合，結合命主的整體命格，說明其一生的財富格局、賺錢方式與財運特質（300字以上）。

接著進行2030年收入預測，必須根據命主出生日期計算實際年齡，嚴格遵守：
- 未滿20歲：年收入上限100萬台幣
- 未滿25歲：年收入上限200萬台幣
- 未滿30歲：年收入上限350萬台幣
- 30歲以上：根據命盤與台灣市場合理推算

預測2030年台幣年收入範圍（兩數字相差不超過100萬），用以下格式呈現：
<div class="highlight-income">NT$ XXX萬 ～ NT$ XXX萬</div>
說明此預測的命盤依據，以及達到此收入的具體路徑。`;

      thirdSection = `【第三段：行為建議】
先用以下格式呈現核心總結：
<div class="highlight-summary">一句話總結命主提升財運最重要的行動方向</div>
接著給予五個面向的具體建議，每個面向至少100字：
1. 生活作息建議（根據命盤特質，說明何時適合工作、休息）
2. 適合產業建議（具體說明為何此命格適合該產業）
3. 職務方向建議（具體職稱或角色，說明原因）
4. 身上飾品建議（根據五行與命格，說明材質、顏色、佩戴位置與原因）
5. 財運特別注意事項（具體說明需要避免的行為與時機）`;

    } else if (question === 'love') {
      secondSection = `【第二段：2026年桃花運深度解析】
深入分析夫妻宮的星曜組合，結合2026年流年，說明：
- 今年桃花運的整體格局與機緣
- 感情發展的時機（哪幾個月特別重要）
- 單身者：今年是否有結婚或穩定感情的機會，什麼類型的對象最有緣
- 有伴者：感情是否有重大進展，需要注意的相處模式
- 今年感情的挑戰與機遇（300字以上）

接著預測2026年底的感情狀態，用以下格式呈現：
<div class="highlight-income">今年感情關鍵字：XXX・XXX・XXX</div>`;

      thirdSection = `【第三段：行為建議】
先用以下格式呈現核心總結：
<div class="highlight-summary">一句話總結命主今年在感情上最重要的行動方向</div>
接著給予五個面向的具體建議，每個面向至少100字：
1. 生活作息建議（哪些時間段適合社交、約會）
2. 適合認識對象的場合與方式（具體說明）
3. 穿著打扮建議（根據五行與命格，說明顏色、風格與原因）
4. 身上飾品建議（根據五行與命格，說明材質、顏色、佩戴位置與原因）
5. 感情特別注意事項（具體說明需要避免的行為與雷區）`;

    } else if (question === 'health') {
      secondSection = `【第二段：身體健康狀況深度解析】
深入分析疾厄宮的星曜組合，結合命主的整體命格，說明：
- 命主天生體質特徵與體能強弱
- 一生中需要特別注意的身體部位與器官系統
- 根據星曜組合，分析潛在的健康風險與疾病傾向
- 2026年流年對健康運的影響，哪幾個月需要特別注意
- 心理健康與情緒管理的建議（300字以上）

接著用以下格式呈現健康重點提醒：
<div class="highlight-income">健康重點關注：XXX系統・XXX部位・XXX調養</div>`;

      thirdSection = `【第三段：行為建議】
先用以下格式呈現核心總結：
<div class="highlight-summary">一句話總結命主維持健康最重要的行動方向</div>
接著給予五個面向的具體建議，每個面向至少100字：
1. 生活作息建議（睡眠時間、工作休息比例，根據命盤說明原因）
2. 飲食建議（根據五行體質，說明適合與需要避免的食物）
3. 運動建議（根據命格特質，說明適合的運動類型與頻率）
4. 身上飾品建議（根據五行與命格，說明有助健康的材質、顏色、佩戴方式）
5. 今年健康特別注意事項（具體說明高風險時期與預防方式）`;

    } else if (question === 'overall') {
      secondSection = `【第二段：人生總運勢全方位解析】
從命盤整體角度，深入分析命主人生各面向的格局：

事業運：根據官祿宮與命宮的組合，說明命主的事業格局、適合的發展方向與人生巔峰時期（100字）
財富運：根據財帛宮的組合，說明財富累積方式與一生財運走向（100字）
感情婚姻：根據夫妻宮的組合，說明感情模式與婚姻緣分（100字）
健康壽元：根據疾厄宮的組合，說明體質特徵與需要注意的健康議題（100字）

接著用以下格式呈現人生最重要的轉捩點：
<div class="highlight-income">人生關鍵轉捩點：XX歲・XX歲・XX歲</div>
說明這些年齡階段的重要意義。`;

      thirdSection = `【第三段：行為建議】
先用以下格式呈現核心總結：
<div class="highlight-summary">一句話總結命主這一生最重要的人生方向</div>
接著給予五個面向的具體建議，每個面向至少100字：
1. 生活作息建議（根據命盤特質，說明最適合的生活節奏）
2. 人生適合的產業方向（具體說明為何此命格適合，以及如何切入）
3. 最適合的職務角色（具體職稱，說明為何與命格契合）
4. 身上飾品建議（根據五行與命格，說明材質、顏色、佩戴位置與招運原理）
5. 人生特別注意事項（具體說明需要避免的決策與行為模式）`;
    }

    const prompt = `你是一位學識淵博、經驗豐富的紫微斗數命理師。請根據以下命盤資料，撰寫一份詳盡的命理分析報告，全文須達1500字以上，以繁體中文書寫。

${baseInfo}

---

請依照以下三個段落結構撰寫報告，使用 HTML 格式輸出：

${commonFirstSection}

${secondSection}

${thirdSection}

---

${commonRules}`;

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
