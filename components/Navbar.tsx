import { signOut, useSession } from "next-auth/client";
import Link from "next/link";
import { useRouter } from "next/router";
import Button from "./Button";
import Container from "./Container";

export default function Navbar() {
    const [session, loading] = useSession();
    const router = useRouter();

    return (
        <div className="w-full sticky top-0">
            <Container className="flex items-center py-2 bg-gray-100 border-b border-gray-400" width="full">
                <Link href="/"><a>Scratchpad</a></Link>
                <div className="ml-auto flex items-center" style={{gridGap: 16}}>
                    {!loading ? session ? (
                        <>
                        <Button onClick={() => signOut()} className="text-sm">Sign out</Button>
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