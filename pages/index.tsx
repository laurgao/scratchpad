import { format } from "date-fns";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/client";
import Container from "../components/Container";
import H2 from "../components/H2";
import PrimaryButton from "../components/PrimaryButton";
import SEO from "../components/SEO";
import SignInButton from "../components/SignInButton";
import { FileModel } from "../models/File";
import { FolderModel } from "../models/Folder";
import { SectionModel } from "../models/Section";
import { UserModel } from "../models/User";
import dbConnect from "../utils/dbConnect";

export default function Home(props: {loggedIn: boolean}) {
    return (
        <>
        <SEO />
        <div className="bg-blue-300 absolute left-0 w-full" style={{height: "40vh", top: "70vh", zIndex: -10, transform: "skew(0deg, -5deg)",}}/>
        <Container>
            <div className="flex justify-center text-center" style={{marginTop: 160, marginBottom: 80, flexDirection: "column"}}>
            <H2 className="mb-4">Never clog your good notes with incoherent stuff again.</H2>
            <p>Unload your working memory in a centralized place where you're <i>supposed</i> to braindump incoherent stuff, and remove all those text files lying around your desktop.</p>
            <div className="flex justify-center w-full" style={{marginTop: 40, marginBottom: 40}}>{props.loggedIn ? <PrimaryButton href="/app">Visit dashboard</PrimaryButton> : <SignInButton />}</div>
            <img src="/hero.png"/>
            </div>
        </Container>
        </>
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

            const newFile = await FileModel.create({
                folder: newFolder._id,
                name: format(new Date(), "yyyy-MM-dd"),
            })

            newUser.lastOpenedFile = newFile._id
            await newUser.save();

            const newSection = await SectionModel.create({
                file: newFile._id,
            })

            newFile.lastOpenSection = newSection._id
            await newFile.save()
        }

        return {redirect: {permanent: false, destination: "/app"}};
    } catch(e) {
        return {notFound: true}
    }
};