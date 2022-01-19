import { ReactNode } from "react"
import Container from '../components/Container'
import H2 from '../components/H2'
import { A } from './index'

const Error = ({statusCode}) => (
    <NextJSCopyErrorComponent
        statusCode={statusCode}
        message = {statusCode
            ? `A server-side error occurred.`
            : 'A client-side error occured.'
        }
        message2 = {
            <p>Want to report a bug? I&apos;d greatly appreciate if you contact me @ gaolauro@gmail.com or make an issue on{" "}
                <A href="https://github.com/laurgao/scratchpad/issues/new">GitHub</A>. Thank you :D
            </p>
        }
    />
)

Error.getInitialProps = ({ res, err }) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404
    return { statusCode }
}
  
export default Error

export const NextJSCopyErrorComponent = (props: {statusCode?, message, message2: ReactNode}) => (
    <Container className="flex items-center justify-center text-center h-screen">
        <div>
            <div className="flex items-center justify-center mb-10">
                {props.statusCode && (
                    <div className="border-r border-black pr-4 mr-4 h-20 flex items-center">
                        <H2>{props.statusCode}</H2>
                    </div>
                )}
                <p>{props.message}</p>
            </div>
            {props.message2}
        </div>
        
        <footer className="text-sm text-gray-400 fixed bottom-8 text-center">
            <A href="/">Return home</A>
        </footer>
    </Container>    
)
  
