import { NextRequest } from "next/server";

//import { request } from "../common";
// import type { Response } from "../common";

export const OPENAI_URL = "api.openai.com";
const DEFAULT_PROTOCOL = "https";
const PROTOCOL = process.env.PROTOCOL ?? DEFAULT_PROTOCOL;
const BASE_URL = process.env.BASE_URL ?? OPENAI_URL;
const DISABLE_GPT4 = !!process.env.DISABLE_GPT4;

const proUrl = "http://bam.fsig.com.cn:8080/fsig-service/services?wsdl";
const backupUrl = "http://192.168.1.186:8080/fsig-service/services?wsdl";
const esbUrl =
  "http://esb.fsig.com.cn/home/system/com.eibus.web.soap.Gateway.wcp";

const systemFlag = "oa";
const fromSystemFlag = "oa";
const pubKey = "F10AA5DBE73E110A";
const password = "b3Pq7X5yDd81ZtI40";

const axios = require("axios");
const crypto = require("crypto");
const xml2js = require("xml2js");

function generateMD5(input: string) {
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

async function validToken(
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

function extractToken(txt: string) {
  const regex = /<!\[([^>]*)\]>/; // 使用正则表达式匹配
  const match = txt.match(regex);
  if (match && match[1]) {
    return match[1]; // 返回捕获组中的内容
  }
  return ""; // 如果没有匹配到则返回null
}

export async function requestOpenai(req: NextRequest) {
  const controller = new AbortController();
  const authValue = req.headers.get("Authorization") ?? "";
  const openaiPath = `${req.nextUrl.pathname}${req.nextUrl.search}`.replaceAll(
    "/api/",
    "",
  );

  let baseUrl = BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `${PROTOCOL}://${baseUrl}`;
  }

  console.log("[Proxy] ", openaiPath);
  console.log("[Base Url]", baseUrl);

  // if (process.env.OPENAI_ORG_ID) {
  //   console.log("[Org ID]", process.env.OPENAI_ORG_ID);
  // }

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10 * 60 * 1000);

  const fetchUrl = `${baseUrl}/${openaiPath}`;
  const fetchOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      Authorization: authValue,
      ...(process.env.OPENAI_ORG_ID && {
        "OpenAI-Organization": process.env.OPENAI_ORG_ID,
      }),
    },
    cache: "no-store",
    method: req.method,
    body: req.body,
    // @ts-ignore
    duplex: "half",
    signal: controller.signal,
  };

  try {
    const res = await fetch(fetchUrl, fetchOptions);

    // to prevent browser prompt for credentials
    const newHeaders = new Headers(res.headers);
    newHeaders.delete("www-authenticate");

    // to disbale ngnix buffering
    newHeaders.set("X-Accel-Buffering", "no");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handle(req: NextRequest) {
  const ip = req.headers.get("X-Forwarded-For") || req.ip;
  req.headers.set("X-Forwarded-For", ip || "");
  //return await request(req);

  const controller = new AbortController();
  let baseUrl = BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `${PROTOCOL}://${baseUrl}`;
  }
  const authValue = req.headers.get("Authorization") ?? "";
  const uri = `${req.nextUrl.pathname}${req.nextUrl.search}`.replaceAll(
    "/api/",
    "",
  );

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10 * 60 * 1000);

  try {
    console.log(`url = ${baseUrl}/${uri}`);
    // console.log('req.headers', req.headers)
    const contentType =
      req.headers.get("Content-Type") ||
      req.headers.get("content-type") ||
      "application/json";
    const newContentType = contentType.startsWith("multipart/form-data")
      ? contentType
      : "application/json";
    // console.log('contentType = ' + contentType + ', newContentType = ' + newContentType)

    const method = req.method;
    if (method === "POST" && uri === "login") {
      const txt = await req.text();
      const token = extractToken(txt);
      const timeStamp = Date.now().toString();
      const signData = `${systemFlag}#${timeStamp}#${token}#${pubKey}`;
      const sign = generateMD5(signData);

      const tokenResp = await validToken(
        token,
        timeStamp,
        systemFlag,
        sign,
        fromSystemFlag,
        "",
      );

      if (tokenResp) {
        console.log("tokenResp", tokenResp);
        const resultFlg = (tokenResp as { resultFlg: string }).resultFlg;
        const userAcct = (tokenResp as { userAcct: string }).userAcct;
        if (!resultFlg || resultFlg.toLowerCase() !== "true" || !userAcct) {
          const resp = {
            code: 401,
            message: "token invalid:" + tokenResp,
            data: {},
          };
          return new Response(JSON.stringify(resp), {
            status: 401,
            statusText: "token invalid:" + tokenResp,
            headers: {
              "Content-Type": "application/json",
            },
          });
        } else {
          const res = await fetch(`${baseUrl}/${uri}`, {
            headers: {
              "Content-Type": newContentType,
              Authorization: authValue,
            },
            cache: "no-store",
            method: method,
            body: new Blob(
              [JSON.stringify({ username: userAcct, password: password })],
              { type: "application/json" },
            ),
            // @ts-ignore
            duplex: "half",
            signal: controller.signal,
          });

          // to prevent browser prompt for credentials
          const newHeaders = new Headers(res.headers);
          newHeaders.delete("www-authenticate");

          // to disbale ngnix buffering
          newHeaders.set("X-Accel-Buffering", "no");

          return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: newHeaders,
          });
        }
      }
    } else {
      const res = await fetch(`${baseUrl}/${uri}`, {
        headers: {
          "Content-Type": newContentType,
          Authorization: authValue,
        },
        cache: "no-store",
        method: method,
        body: req.body,
        // @ts-ignore
        duplex: "half",
        signal: controller.signal,
      });

      // to prevent browser prompt for credentials
      const newHeaders = new Headers(res.headers);
      newHeaders.delete("www-authenticate");

      // to disbale ngnix buffering
      newHeaders.set("X-Accel-Buffering", "no");

      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: newHeaders,
      });
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
