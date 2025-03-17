import type { FC } from "hono/jsx";
import type { Context, Next } from "hono";

const bucketURL = "https://cdn.billlaaayyy.dev";

export default async function botDropOut(c: Context, next: Next) {
  const userAgent = c.req.header("User-Agent");
  const path = c.req.path;
  const url = c.req.url;
  if ((userAgent?.search("bot") != -1) || (userAgent?.search("Bot") != -1)) {
    console.log("bot detected");
    return c.render(<BotResponse path={path} url={url} />);
  } else {
    await next();
  }
}

const BotResponse: FC<{ path: string, url: string }> = async (props: { path: string; url: string; }) => {
  const pathArray = props.path.slice(1).split("/");
  let requestType: "users" | "posts" | null = null;
  let uuid: string | null = null;
  let content: UserContent | PostContent | null = null;

  // There should be a better way to do this but oh well
  if ((pathArray[0] === "users") || (pathArray[0] === "posts")) {
    uuid = pathArray[1];
    requestType = pathArray[0];
  }

  if (requestType === "users") {
    try {
      const r = await fetch(`/api/users/${uuid}`);
      const j: APIResponse<UserShape> = await r.json();
      if (!r.ok) { throw new Error("API Error") }
      if (!r.ok) { throw new Error("Query Error") }
      content = {
        contentType: "user",
        handle: j.data?.handle,
        url: props.url,
        image: `${bucketURL}/${j.data?.avatar}`,
      } as UserContent
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      }
      content = null;
    }
  } else if (requestType === "posts") {
    try {
      const r = await fetch(`/api/posts/${uuid}`);
      const j: APIResponse<PostShape> = await r.json();
      if (!r.ok) { throw new Error("API Error") }
      if (!r.ok) { throw new Error("Query Error") }
      content = {
        contentType: "post",
        handle: j.data?.handle,
        url: props.url,
        image: avatarFormatter(j.data?.avatar),
        content: j.data?.content,
        createdAt: j.data?.created_at,
      } as PostContent
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      }
      content = null;
    }
  } else {
    content = null;
  }

  return (
    <html>
      <head>
        <BoilerPlate content={content} />
      </head>
    </html>
  );
}

const BoilerPlate: FC<{
  content: UserContent | PostContent | null,
}> = (props: {
  content: UserContent | PostContent | null,
}) => {
    const url = props?.content?.url || "https://app.billlaaayyy.dev";
    console.log(props.content);
    let title = "Welcome to App";
    if ("user" === props.content?.contentType) {
      title = "Check out " + props.content.handle;
    } else if ("post" === props.content?.contentType) {
      title = props.content?.handle + ": " + props?.content?.content.slice(0, 90) + "..."
    }

    return (
      <>
        <meta property="og:title" content={title} />
        <meta property="og:site_name" content="App: Another Platform for Posting" />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />

        <meta name="twitter:title" content={title} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="App: Another Platform for Posting" />
        {props.content != null ?
          <>
            <meta name="twitter:image" content={props.content.image} />
            <meta property="og:image" content={props.content.image} />
          </>
          :
          <>
            <meta name="twitter:image" content="https://cdn.billlaaayyy.dev/placeholder.jpg" />
            <meta property="og:image" content="https://cdn.billlaaayyy.dev/placeholder.jpg" />
          </>
        }
      </>
    );
  }

function avatarFormatter(avatar: string | null | undefined): string {
  const url = avatar ? `${bucketURL}/${avatar}.jpg` : `${bucketURL}/avatar.jpg`;
  return url;
}

interface BaseContent {
  handle: string;
  url: string;
  image: string;
}

interface UserContent extends BaseContent {
  contentType: "user";
}

interface PostContent extends BaseContent {
  contentType: "post";
  content: string;
  createdAt: string;
}

interface UserShape {
  uuid: string,
  about: string,
  avatar: string,
  created_at: string,
  display_name: string,
  email: string,
  handle: string,
  location: string,
}

interface PostShape {
  avatar: string;
  comment_count: number;
  content: string;
  created_at: string;
  display_name: string;
  handle: string;
  like_count: number;
  post_uuid: string;
  user_uuid: string;
}

interface APIResponse<T> {
  success: boolean;
  path: string;
  message: string;
  data?: T;
}
