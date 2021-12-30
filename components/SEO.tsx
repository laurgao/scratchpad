import {NextSeo} from "next-seo";
import {useRouter} from "next/router";

export default function SEO({
                                  title = "",
                                  description = "Never clog your good notes with incoherent stuff again.",
                                  imgUrl = null,
                                  authorUsername = null,
                                  publishedDate = null,
                                  noindex = false,
                              }: { title?: string, description?: string, imgUrl?: string, authorUsername?: string, publishedDate?: string, noindex?: boolean }) {
    const router = useRouter();

    let fullTitle;
    if (!title) fullTitle = "Scratchpad: Unload your working memory in the centralized place you're supposed to braindump incoherent stuff." 
    else fullTitle = title + " | Scratchpad";

    let openGraph = {
        title: fullTitle,
        description: description,
        url: "https://scratchie.vercel.app" + router.asPath,
        images: imgUrl ? [
            { url: imgUrl }
        ] : [
            { url: "https://scratchie.vercel.app/hero.png" }
        ],
    };

    let twitter = {
        site: "@laurgao",
        cardType: imgUrl ? "summary_large_image" : "summary",
    };

    return (
        <NextSeo
            title={fullTitle}
            description={description}
            openGraph={openGraph}
            twitter={twitter}
            noindex={noindex}
        />
    );
}
