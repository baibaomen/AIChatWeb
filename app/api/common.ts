import { NextRequest, NextResponse } from "next/server";

export const OPENAI_URL = "api.openai.com";
const DEFAULT_PROTOCOL = "https";
const PROTOCOL = process.env.PROTOCOL ?? DEFAULT_PROTOCOL;
const BASE_URL = process.env.BASE_URL ?? OPENAI_URL;
const DISABLE_GPT4 = !!process.env.DISABLE_GPT4;

const password = "b3Pq7X5yDd81ZtI40";
var counter = 0;
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

function extractToken(txt: string) {
  const regex = /<!\[([^>]*)\]>/; // 使用正则表达式匹配
  const match = txt.match(regex);
  if (match && match[1]) {
    return match[1]; // 返回捕获组中的内容
  }
  return ""; // 如果没有匹配到则返回null
}

export async function request(req: NextRequest) {
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
    console.log(`url3 = ${baseUrl}/${uri}`);
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
      console.log("process login post");
      const txt = await req.text();
      console.log("req.text is :" + txt);
      const token = extractToken(txt);
      console.log("token is:" + token);
      const tRsp = await fetch(
        "http://47.251.66.86:8081/validate?token=" + token,
      );
      const tokenResp = await tRsp.json();

      console.log("8081 returned:" + JSON.stringify(tokenResp));

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
          var res = await fetch(`${baseUrl}/${uri}`, {
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

          console.log(`request ${baseUrl}/${uri} returned.`);
          var rspJson = await res.json();
          console.log(
            `request ${baseUrl}/${uri} returned:` + JSON.stringify(rspJson),
          );
          // to prevent browser prompt for credentials
          const newHeaders = new Headers(res.headers);
          newHeaders.delete("www-authenticate");

          // to disbale ngnix buffering
          newHeaders.set("X-Accel-Buffering", "no");

          console.log(11);
          if (rspJson && (rspJson as { code: number }).code === 10000) {
            console.log(1);

            console.log(
              "respJson is " + JSON.stringify(rspJson) + ", to register.",
            );
            const regResp = await fetch(`${baseUrl}/register`, {
              headers: {
                "Content-Type": newContentType,
                Authorization: authValue,
              },
              cache: "no-store",
              method: method,
              body: new Blob(
                [
                  JSON.stringify({
                    name: "",
                    username: userAcct,
                    password: password,
                    captchaId: "register-6b9ee1a1-79ca-4483-a649-92bcd0330447",
                    captcha: "",
                    email: "",
                    phone: "",
                    code: "",
                    inviteCode: "",
                  }),
                ],
                { type: "application/json" },
              ),
              // @ts-ignore
              duplex: "half",
              signal: controller.signal,
            });

            console.log(2);
            console.log(await regResp.json());

            res = await fetch(`${baseUrl}/${uri}`, {
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

            rspJson = await res.json();

            console.log(3);
          } else {
            console.log(11);
          }

          console.log(4);

          return new Response(
            new Blob([JSON.stringify(rspJson)], { type: "application/json" }),
            {
              status: res.status,
              statusText: res.statusText,
              headers: newHeaders,
            },
          );
        }
      }
    } else {
      console.log(5);
      const res = await fetch(`${baseUrl}/${uri}`, {
        headers: {
          "Content-Type": newContentType,
          Authorization: authValue,
        },
        cache: "no-store",
        method: req.method,
        body: req.body,
        // @ts-ignore
        duplex: "half",
        signal: controller.signal,
      });

      console.log(6);

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
    console.log(71);
    clearTimeout(timeoutId);
  }
}

export interface Response<T> {
  code: number;

  message: string;

  data: T;
}
