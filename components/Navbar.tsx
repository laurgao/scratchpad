import { signOut, useSession } from "next-auth/client";
import { useRouter } from "next/router";
import Button from "./Button";
import Container from "./Container";

export default function Navbar() {
    const [session, loading] = useSession();
    const router = useRouter();

    return (
        <div className="w-full sticky top-0">
            <Container className="flex items-center my-4" width="full">
                <p>Scratchpad</p>
                <div className="ml-auto flex gap-4">
                    {(session && router.route !== "/") ? (
                        <>
                        <Button onClick={() => signOut()}>Sign out</Button>
                        <img
                            src={session.user.image}
                            alt={`Profile picture of ${session.user.name}`}
                            className="w-8 h-8 rounded-full"
                        />
                        </>
                    ) : (
                        <Button onClick={() => router.push("/")}>Sign in</Button>
                    )}
                </div>
            </Container>
        </div>
    );
}