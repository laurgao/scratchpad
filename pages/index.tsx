import { GetServerSideProps } from "next";
import { getSession } from "next-auth/client";
import SignInButton from "../components/SignInButton";
import { UserModel } from "../models/User";
import dbConnect from "../utils/dbConnect";

export default function Home() {
    return (
        <div className="flex items-center justify-center h-screen">
            <SignInButton />
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const session = await getSession(context);
    if (!session) return {props: {}};

    try {
        await dbConnect();
        const thisUser = await UserModel.findOne({email: session.user.email});
        if (!thisUser) {
            await UserModel.create({
                email: session.user.email,
                name: session.user.name,
                image: session.user.image,
            });
        }

        return {redirect: {permanent: false, destination: "/app"}};
    } catch(e) {
        return {notFound: true}
    }
};