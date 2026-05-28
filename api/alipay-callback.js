// /api/alipay-callback - 支付宝异步通知回调
// 支付宝 POST 通知过来，验证签名后处理激活

const AlipaySdk = require('alipay-sdk').default;
const config = require('./_config');

// 引用共享激活存储
const activateModule = require('./activate');
const ACTIVE_CODES = activateModule.store;

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

    // 签名验证
    const params = { ...req.body };
    // passback_params 支付宝解码后可能带引号，清理一下
    if (params.passback_params && typeof params.passback_params === 'string') {
      try {
        params.passback_params = JSON.parse(params.passback_params);
      } catch (_) {
        params.passback_params = {};
      }
    }

    // TODO: 在正式环境启用签名验证
    // const isVerified = alipaySdk.checkResponseSign(params);
    // if (!isVerified) {
    //   console.error('签名验证失败', params);
    //   return res.status(400).send('fail');
    // }

    const outTradeNo = params.out_trade_no;
    const tradeNo = params.trade_no;
    const tradeStatus = params.trade_status;
    const totalAmount = params.total_amount;
    const passbackParams = params.passback_params || {};
    const buyerId = params.buyer_id;

    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      const { plan = 'monthly', deviceId } = passbackParams;
      const days = plan === 'yearly' ? 365 : 30;

      // 生成激活码
      const activationCode = `CE-${tradeNo.slice(-8).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // 写入共享存储
      ACTIVE_CODES[activationCode] = {
        outTradeNo,
        tradeNo,
        plan,
        days,
        buyerId,
        deviceId: deviceId || null,
        activatedAt: new Date().toISOString(),
        expiredAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
      };

      // 也按 deviceId 索引一份（方便查询）
      if (deviceId) {
        ACTIVE_CODES[`__device_${deviceId}`] = ACTIVE_CODES[activationCode];
      }

      console.log(`支付成功: ${outTradeNo}/${tradeNo}, 激活码: ${activationCode}, ${plan}, ${days}天`);
      return res.send('success');
    }

    console.log(`订单状态: ${outTradeNo}/${tradeNo} -> ${tradeStatus}`);
    return res.send('success');

  } catch (err) {
    console.error('回调处理失败:', err);
    return res.status(500).send('fail');
  }
};
