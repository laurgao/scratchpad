import { GetServerSideProps } from "next";
import { getSession } from "next-auth/client";
import SignInButton from "../components/SignInButton";
import { UserModel } from "../models/User";
import { FolderModel } from "../models/Folder";
import { FileModel } from "../models/File";
import dbConnect from "../utils/dbConnect";
import { format } from "date-fns";
import Button from "../components/Button";

export default function Home(props: {loggedIn: boolean}) {
    return (
        <div className="flex items-center justify-center h-screen">
            {props.loggedIn ? <SignInButton /> : <Button href="/app">Visit dashboard</Button>}
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const session = await getSession(context);
    if (!session) return {props: {loggedIn: false}};

    try {
        await dbConnect();
        const thisUser = await UserModel.findOne({email: session.user.email});
        if (thisUser) return {props: {loggedIn: true}};

        else {
            const newUser = await UserModel.create({
                email: session.user.email,
                name: session.user.name,
                image: session.user.image,
            });

            const newFolder = await FolderModel.create({
                user: newUser._id,
                name: "Daily"
            })

            const newNote = await FileModel.create({
                folder: newFolder._id,
                name: format(new Date(), "yyyy-MM-dd"),
            })
        }

        return {redirect: {permanent: false, destination: "/app"}};
    } catch(e) {
        return {notFound: true}
    }
};