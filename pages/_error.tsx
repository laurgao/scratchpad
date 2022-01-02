import Container from '../components/Container'
import H2 from '../components/H2'
import { A } from './index'

const Error = ({statusCode}) => {
    return (
        <Container className="flex items-center justify-center text-center" style={{height: "calc(100vh - 98px)"}}>
            <div>
                <div className="flex items-center justify-center mb-10">
                    <div className="border-r border-black pr-4 mr-4 h-20 flex items-center">
                        <H2 className="">{statusCode}</H2>
                    </div>
                    <p>
                        {statusCode
                            ? `A server-side error occurred.`
                            : 'A client-side error occured.'}
                    </p>
                </div>
                <p>Want to report a bug? I'd greatly appreciate if you contact me @ gaolauro@gmail.com or make an issue on <A href="https://github.com/laurgao/scratchpad">GitHub</A>. Thank you :D</p>
            </div>
        </Container>
    )
}

Error.getInitialProps = ({ res, err }) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404
    return { statusCode }
}
  
export default Error
  
