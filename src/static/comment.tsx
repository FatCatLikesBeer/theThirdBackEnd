import type { FC } from "hono/jsx";

const Head: FC = (props) => {
  const titleContent = props.title || "Static Post";
  return (
    <head>
      <title>{titleContent}</title>
      <meta property="og:title" content="OpenGraph Title" />
      <meta property="og:description" content="OpenGraph description" />
      <meta property="og:site_name" content="OpenGraph Site Name" />
    </head>
  );
}

const Body: FC = (props) => {
  const bodyContent = props.body;
  return (
    <body>
      <p>Content Goes Here</p>
      <p>{bodyContent}</p>
    </body>
  )
}

const StaticPost: FC = (props) => {
  return (
    <>
      <Head title={props.title} />
      <Body body={props.body} />
    </>
  );
}

export default StaticPost;
