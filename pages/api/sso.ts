
const proUrl = "http://bam.fsig.com.cn:8080/fsig-service/services?wsdl";
const backupUrl = "http://192.168.1.186:8080/fsig-service/services?wsdl";
const esbUrl =
  "http://esb.fsig.com.cn/home/system/com.eibus.web.soap.Gateway.wcp";

export const systemFlag = "oa";
export const fromSystemFlag = "oa";
export const pubKey = "F10AA5DBE73E110A";
export const password = "b3Pq7X5yDd81ZtI40";

const axios = require("axios");
const xml2js = require("xml2js");

export function generateMD5(input: string) {
    const crypto = require("crypto");
    return crypto.createHash("md5").update(input).digest("hex");
}

async function validTokenbackupUrl(
  tokenStr: string,
  timeStamp: string,
  systemFlag: string,
  sign: string,
  fromSystemFlag: string,
  loginMessage: string,
) {
  const soap = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:iam="http://iam.fsig.com.cn/">
        <soapenv:Header/>
        <soapenv:Body>
            <iam:validToken>
                <iam:tokenStr>${tokenStr}</iam:tokenStr>
                <iam:appIdFlag></iam:appIdFlag>
            </iam:validToken>
        </soapenv:Body>
    </soapenv:Envelope>`;

  try {
    const response = await axios.post(backupUrl, soap, {
      headers: { "Content-Type": "text/xml" },
      timeout: 5000,
    });
    console.log("validTokenbackupUrl response:", response.data);

    const parser = new xml2js.Parser({
      tagNameProcessors: [xml2js.processors.stripPrefix],
      explicitArray: false,
    });
    const result = await parser.parseStringPromise(response.data);
    const responseEnvelope = result.Envelope.Body.validTokenResponse;

    let mapresult = {};
    const resultFlg = responseEnvelope.resultFlg;

    if (resultFlg.toLowerCase() === "true") {
      const userAcct = responseEnvelope.userAcct;
      const userId = responseEnvelope.userId;
      mapresult = { resultFlg, userAcct, userId };
    } else {
      const msgCode = responseEnvelope.msgCode;
      const msgContent = responseEnvelope.msgContent;
      mapresult = { resultFlg, msgCode, msgContent };
    }

    return mapresult;
  } catch (error: any) {
    console.error(error.message);
    return null;
  }
}

async function validTokenproUrl(
  tokenStr: string,
  timeStamp: string,
  systemFlag: string,
  sign: string,
  fromSystemFlag: string,
  loginMessage: string,
) {
  const soap = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:iam="http://iam.fsig.com.cn/">
        <soapenv:Header/>
        <soapenv:Body>
            <iam:validToken>
                <iam:tokenStr>${tokenStr}</iam:tokenStr>
                <iam:appIdFlag></iam:appIdFlag>
            </iam:validToken>
        </soapenv:Body>
    </soapenv:Envelope>`;

  try {
    const resp = await axios.post(proUrl, soap, {
      headers: { "Content-Type": "text/xml" },
      timeout: 5000,
    });

    console.log("validTokenproUrl response:", resp.data);

    try {
      const parser = new xml2js.Parser({
        tagNameProcessors: [xml2js.processors.stripPrefix],
        explicitArray: false,
      });
      const result = await parser.parseStringPromise(resp.data);
      let mapresult = {};

      const response =
        result.Envelope.Body.validTokenResponse.ValidTokenResultResponse
          .rtnIsValidToken;
      const resultFlg = response.rtnMessageInfo.resultFlg;

      if (resultFlg.toLowerCase() === "true") {
        const userAcct = response.userAcct;
        const userId = response.userId;
        mapresult = { resultFlg, userAcct, userId };
      } else {
        const msgCode = response.rtnMessageInfo.msgCode;
        if (["E401", "E402", "E900"].includes(msgCode.toUpperCase())) {
          const msgContent = response.rtnMessageInfo.msgContent;
          mapresult = { resultFlg, msgCode, msgContent };
        } else {
          // 调用备用URL的逻辑
          const r = await validTokenbackupUrl(
            tokenStr,
            timeStamp,
            systemFlag,
            sign,
            fromSystemFlag,
            loginMessage,
          );
          if (r) {
            mapresult = r;
          }
        }
      }

      return mapresult;
    } catch (error: any) {
      console.error(error);
      return null;
    }
  } catch (error: any) {
    console.error(error.message);
    return await validTokenbackupUrl(
      tokenStr,
      timeStamp,
      systemFlag,
      sign,
      fromSystemFlag,
      loginMessage,
    );
  }
}

export async function validToken(
  tokenStr: string,
  timeStamp: string,
  systemFlag: string,
  sign: string,
  fromSystemFlag: string,
  loginMessage: string,
) {
  const soap = `<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
        <SOAP:Body>
            <ValidToken xmlns="http://schemas.fsig.com.cn/uasWebserviceWSAppServerPackage" preserveSpace="no" qAccess="0" qValues="">
                <tokenStr>${tokenStr}</tokenStr>
                <appIdFlag></appIdFlag>
                <timestamp>${timeStamp}</timestamp>
                <systemFlag>${systemFlag}</systemFlag>
                <sign>${sign}</sign>
                <fromSystemFlag>${fromSystemFlag}</fromSystemFlag>
            </ValidToken>
        </SOAP:Body>
    </SOAP:Envelope>`;

  try {
    const response = await axios.post(esbUrl, soap, {
      headers: { "Content-Type": "text/xml" },
      timeout: 5000,
    });

    const parser = new xml2js.Parser({
      tagNameProcessors: [xml2js.processors.stripPrefix],
      explicitArray: false,
    });

    const result = await parser.parseStringPromise(response.data);
    const responseEnvelope = result.Envelope.Body.ValidTokenResponse;

    let mapresult = {};
    const resultFlg = responseEnvelope.resultFlg;

    if (resultFlg.toLowerCase() === "true") {
      const userAcct = responseEnvelope.userAcct;
      mapresult = { resultFlg, userAcct };
    } else {
      const msgCode = responseEnvelope.msgCode;
      const errorCodes = [
        "E401",
        "E402",
        "E900",
        "E901",
        "E902",
        "E903",
        "E904",
        "E905",
        "E906",
        "E907",
        "E908",
      ];
      if (errorCodes.includes(msgCode.toUpperCase())) {
        const msgContent = responseEnvelope.msgContent;
        mapresult = { resultFlg, msgCode, msgContent };
      } else {
        const r = await validTokenproUrl(
          tokenStr,
          timeStamp,
          systemFlag,
          sign,
          fromSystemFlag,
          loginMessage,
        );
        if (r) {
          mapresult = r;
        }
      }
    }

    return mapresult;
  } catch (error: any) {
    console.error(error.message);
    return await validTokenproUrl(
      tokenStr,
      timeStamp,
      systemFlag,
      sign,
      fromSystemFlag,
      loginMessage,
    );
  }
}

export function extractToken(txt: string) {
  const regex = /<!\[([^>]*)\]>/; // 使用正则表达式匹配
  const match = txt.match(regex);
  if (match && match[1]) {
    return match[1]; // 返回捕获组中的内容
  }
  return ""; // 如果没有匹配到则返回null
}