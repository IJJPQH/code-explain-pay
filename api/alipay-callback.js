// /api/alipay-callback - 支付宝异步通知回调
// 支付宝 POST 通知过来，验证签名后处理激活

const AlipaySdk = require('alipay-sdk').default;
const config = require('./_config');

// 临时内存存储（Vercel 无持久化，生产要用数据库/Redis/文件存储）
// 这里用 Vercel KV 或 JSON 文件模拟，生产环境需换成数据库
const ACTIVE_CODES = {};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.send('callback endpoint ready');
  }

  try {
    const alipaySdk = new AlipaySdk({
      appId: config.appId,
      privateKey: config.merchantPrivateKey,
      alipayPublicKey: config.alipayPublicKey,
      charset: 'utf-8',
      signType: 'RSA2',
      gateway: 'https://openapi.alipay.com/gateway.do',
    });

    // 验证支付宝通知签名
    const params = req.body;
    const isVerified = alipaySdk.checkResponseSign(params);

    if (!isVerified) {
      console.error('签名验证失败', params);
      return res.status(400).send('fail');
    }

    // 获取订单信息
    const outTradeNo = params.out_trade_no;
    const tradeNo = params.trade_no;          // 支付宝交易号
    const tradeStatus = params.trade_status;   // TRADE_SUCCESS
    const totalAmount = params.total_amount;
    const passbackParams = params.passback_params ? JSON.parse(params.passback_params || '{}') : {};
    const buyerId = params.buyer_id;           // 买家支付宝ID

    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      // 生成激活码：有效期内可激活 Pro
      const { plan = 'monthly', deviceId, extensionId } = passbackParams;
      const days = plan === 'yearly' ? 365 : 30;

      const activationCode = `CE-${tradeNo.slice(-8).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // 存储激活信息（生产环境写入数据库）
      ACTIVE_CODES[activationCode] = {
        outTradeNo,
        tradeNo,
        plan,
        days,
        buyerId,
        activatedAt: new Date().toISOString(),
        expiredAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        deviceId: deviceId || null,
      };

      console.log(`支付成功: ${outTradeNo}, 激活码: ${activationCode}, ${plan}, ${days}天`);

      // 返回成功给支付宝
      return res.send('success');
    }

    // 其他状态（等待支付、关闭等）
    console.log(`订单状态: ${outTradeNo} -> ${tradeStatus}`);
    return res.send('success');

  } catch (err) {
    console.error('回调处理失败:', err);
    return res.status(500).send('fail');
  }
};

// 给前端查询激活码的接口（前端在支付完成后轮询或展示激活码）
module.exports.getActivationCode = (tradeNo) => {
  for (const [code, info] of Object.entries(ACTIVE_CODES)) {
    if (info.tradeNo === tradeNo) return { code, ...info };
  }
  return null;
};
