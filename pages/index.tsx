import { GetServerSideProps } from "next";
import { getSession } from "next-auth/client";
import SignInButton from "../components/SignInButton";
import { UserModel } from "../models/User";
import { FolderModel } from "../models/Folder";
import { FileModel } from "../models/File";
import dbConnect from "../utils/dbConnect";
import { format } from "date-fns";
import Button from "../components/Button";
import H2 from "../components/H2";
import SEO from "../components/SEO";
import Container from "../components/Container";

export default function Home(props: {loggedIn: boolean}) {
    return (
        <>
        <SEO />
        <div style={{backgroundColor: "rgb(147, 197, 253)", position: "absolute", height: "40vh", width: "100%", top: "70vh",  left: 0, zIndex: -10, transform: "skew(0deg, -5deg)",} /* tailwind blue 300 */ }/>
        <Container>
            <div className="flex justify-center text-center" style={{marginTop: 160, marginBottom: 80, flexDirection: "column"}}>
            <H2 className="mb-4">Never clog your good notes with incoherent stuff again.</H2>
            <p>Unload your working memory in a centralized place where you're <i>supposed</i> to braindump incoherent stuff, and remove all those text files lying around your desktop.</p>
            <div className="flex justify-center w-full" style={{marginTop: 40, marginBottom: 40}}>{props.loggedIn ? <Button href="/app">Visit dashboard</Button> : <SignInButton />}</div>
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
        }

        return {redirect: {permanent: false, destination: "/app"}};
    } catch(e) {
        return {notFound: true}
    }
};