import { format } from "date-fns";
import { GetServerSideProps } from "next";
import { getSession, signIn } from "next-auth/client";
import { FaGoogle } from "react-icons/fa";
import Container from "../components/Container";
import H2 from "../components/H2";
import PrimaryButton from "../components/PrimaryButton";
import SEO from "../components/SEO";
import { FileModel } from "../models/File";
import { FolderModel } from "../models/Folder";
import { SectionModel } from "../models/Section";
import { UserModel } from "../models/User";
import dbConnect from "../utils/dbConnect";

export default function Home(props: {loggedIn: boolean}) {
    return (
        <>
        <SEO />
        <div className="bg-blue-300 absolute left-0 w-full" style={{height: "40vh", top: "80vh", zIndex: -10, transform: "skew(0deg, -5deg)",}}/>
        <Container className="mt-40 flex justify-center text-center flex-col mb-4">
            <H2 className="mb-4">Never clog your good notes with incoherent stuff again.</H2>
            <p>Unload your working memory in a centralized place where you&apos;re <i>supposed</i> to braindump incoherent stuff, and remove all those text files lying around your desktop.</p>
            <div className="flex justify-center w-full my-10">{
                props.loggedIn ? 
                <PrimaryButton href="/app">Visit dashboard</PrimaryButton> 
                : 
                <PrimaryButton onClick={() => signIn("google")} className="flex items-center"> 
                    <FaGoogle/><span className="ml-2">Sign in</span>
                </PrimaryButton>
            }</div>
            <img src="/hero.png" alt="Dump of text files vs. Scratchpad" className="mb-24"/>
            
            <footer className="text-sm text-gray-400">
                <A href="https://github.com/laurgao/scratchpad">Source code</A> on Github
            </footer>
        </Container>
        </>
    );
}

// Props can be anything in React.HTMLProps<HTMLAnchorElement> except for className, which will be overwritten
export const A = (props: React.HTMLProps<HTMLAnchorElement>) => <a {...props} className="underline hover:text-blue-400 transition"/>

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