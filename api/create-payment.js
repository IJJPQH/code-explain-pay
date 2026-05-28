// /api/create-payment - 创建支付宝订单
// Vercel Serverless Function

const AlipaySdk = require('alipay-sdk').default;
const AlipayFormData = require('alipay-sdk/lib/form').default;
const config = require('./_config');

// 商品定价
const PLANS = {
  monthly: { price: '9.90', name: 'CodeExplain Pro 月付' },
  yearly: { price: '69.00', name: 'CodeExplain Pro 年付' },
};

module.exports = async (req, res) => {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { plan = 'monthly', deviceId, extensionId } = req.body;
    const planInfo = PLANS[plan];
    if (!planInfo) return res.status(400).json({ error: '无效的套餐类型' });

    // 生成订单号: 日期 + 随机数
    const now = new Date();
    const dateStr = now.getFullYear()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
    const outTradeNo = `CE${dateStr}${rand}`;

    const alipaySdk = new AlipaySdk({
      appId: config.appId,
      privateKey: config.merchantPrivateKey,
      alipayPublicKey: config.alipayPublicKey,
      charset: 'utf-8',
      signType: 'RSA2',
      gateway: 'https://openapi.alipay.com/gateway.do',
    });

    const formData = new AlipayFormData();
    formData.setMethod('get');  // GET 方式返回 URL
    formData.addField('appId', config.appId);
    formData.addField('method', 'alipay.trade.page.pay');
    formData.addField('format', 'JSON');
    formData.addField('returnUrl', config.returnUrl);
    formData.addField('charset', 'utf-8');
    formData.addField('signType', 'RSA2');
    formData.addField('notifyUrl', config.notifyUrl);
    formData.addField('bizContent', {
      out_trade_no: outTradeNo,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: planInfo.price,
      subject: planInfo.name,
      body: `${planInfo.name} | device:${deviceId || ''} | ext:${extensionId || ''}`,
      passback_params: JSON.stringify({ plan, deviceId, extensionId }),
    });

    const result = await alipaySdk.exec('alipay.trade.page.pay', {}, { formData });
    // result 是跳转 URL
    const payUrl = result;

    res.json({
      success: true,
      payUrl,
      outTradeNo,
      amount: planInfo.price,
      productName: planInfo.name,
    });

  } catch (err) {
    console.error('创建订单失败:', err);
    res.status(500).json({ error: '创建订单失败', detail: err.message });
  }
};
