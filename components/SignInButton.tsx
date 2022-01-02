import { signIn } from "next-auth/client";
import { FaGoogle } from "react-icons/fa";
import PrimaryButton from "./PrimaryButton";

export default function SignInButton() {
    return ( 
        <PrimaryButton onClick={() => signIn("google")}> 
            <div className="flex items-center">
                <FaGoogle/><span className="ml-2">Sign in</span>
            </div>
        </PrimaryButton>
    );
}