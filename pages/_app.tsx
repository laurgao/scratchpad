import { Provider } from "next-auth/client";
import Router, { useRouter } from "next/router";
import NProgress from "nprogress";
import ReactModal from "react-modal";
import "../styles/globals.css";
import "../styles/markdown-editor.css";
import "../styles/nprogress.css";

Router.events.on("routeChangeStart", () => NProgress.start());
Router.events.on("routeChangeComplete", () => NProgress.done());
Router.events.on("routeChangeError", () => NProgress.done());

export default function App({Component, pageProps}) {
    const router = useRouter();
    return (
        <Provider session={pageProps.session}>
            <div id="app-root">
                <Component {...pageProps} />
            </div>
        </Provider>
    );
}

ReactModal.setAppElement("#app-root");