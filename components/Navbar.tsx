import { signOut, useSession } from "next-auth/client";
import { useRouter } from "next/router";
import Button from "./Button";
import Container from "./Container";
import Link from "next/link";

export default function Navbar() {
    const [session, loading] = useSession();
    const router = useRouter();

    return (
        <div className="w-full sticky top-0">
            <Container className="flex items-center my-4" width="full">
                <Link href="/"><a>Scratchpad</a></Link>
                <div className="ml-auto flex items-center" style={{gridGap: 16}}>
                    {!loading ? session ? (
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
                    ) : <p>Loading...</p>}
                </div>
            </Container>
        </div>
    );
}