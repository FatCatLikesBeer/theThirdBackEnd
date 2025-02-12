import type { FC } from 'hono/jsx';

const Docs: FC = async () => {
  return (
    <>
      <head>
        <style src="./styles.css" />
      </head>
      <body>
        <h1>Docs</h1>
        <h2>Endpoints</h2>
        <div>
          <p><code>/users</code></p>
          <p><code>/friends</code></p>
          <p><code>/posts</code></p>
          <p><code>/posts/:postUUID/comments</code></p>
          <p><code>/posts/:postUUID/likes</code></p>
          <p><code>/posts/:postUUID/comments/:commentUUID/likes</code></p>
        </div>
        <h2>Response structure</h2>
        <div>
          <p><code>json: {"{"} </code></p>
          <div style={styles.indent1}>
            <p><code>success: {"{boolean}"},</code></p>
            <p><code>path: {"{uri}"},</code></p>
            <p><code>message: {"{string}"},</code></p>
            <p><code>data?: {"{array || number}"},</code></p>
          </div>
          <p><code>{"}"}</code></p>
        </div>
      </body>
    </>
  );
}

const styles = {
  indent1: {
    marginLeft: "1.2rem"
  }
}

export { Docs };
