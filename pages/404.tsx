import { A } from './index'
import { NextJSCopyErrorComponent } from "./_error"

// fyi without this file, nextjs'd use _error.tsx with statusCode=404
const custom404 = () => (
    <NextJSCopyErrorComponent
        statusCode={404}
        message="This page could not be found."
        message2={
            <p>Think this is a mistake? Contact me @ gaolauro@gmail.com or make an issue on{" "}
                <A href="https://github.com/laurgao/scratchpad">GitHub</A>
            </p>
        }
    />
)

export default custom404
