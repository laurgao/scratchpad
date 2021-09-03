import axios from "axios";
import { signIn } from "next-auth/client";
import { useRouter } from "next/router";
import { FaGoogle } from "react-icons/fa";
import Button from "./Button";

export default function SignInButton() {
    function onSubmit() {
        // setIsLoading(true);
        const router = useRouter();

        axios.post("/api/auth/account", {
            // username: username,
        }).then(res => {
            if (res.data.error) {
                // setError(res.data.error);
                // setIsLoading(false);
            } else {
                console.log("redirecting...");
                router.push("/app")
            }
        }).catch(e => {
            // setIsLoading(false);
            // setError("An unknown error occurred.");
            console.log(e);
        });
    }

    return ( // .then(onSubmit).catch(e => console.log(e))
        <Button onClick={() => signIn("google")}> 
            <div className="flex items-center">
                <FaGoogle/><span className="ml-2">Sign in</span>
            </div>
        </Button>
    );
}