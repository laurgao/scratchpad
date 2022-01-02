import Container from '../components/Container'
import H2 from '../components/H2'
import { A } from './index'

const custom404 = () => {
    return (
        <Container className="flex items-center justify-center text-center" style={{height: "calc(100vh - 98px)"}}>
            <div>
                <div className="flex items-center justify-center mb-10">
                    <div className="border-r border-black pr-4 mr-4 h-20 flex items-center">
                        <H2 className="">404</H2>
                    </div>
                    <p>This page could not be found.</p>
                </div>
                <p>Think this is a mistake? Contact me @ gaolauro@gmail.com or make an issue on <A href="https://github.com/laurgao/scratchpad">GitHub</A></p>
            </div>
        </Container>
    )
}

export default custom404
