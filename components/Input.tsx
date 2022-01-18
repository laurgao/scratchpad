import { Dispatch, SetStateAction } from "react";
import H3 from "./H3";

type InputProps = React.HTMLProps<HTMLInputElement> 
& {setValue?: Dispatch<SetStateAction<string>>, type?: "text"|"textarea"|"date", name?: string};

const Input = (props: InputProps) => {
    const newProps = {...props}
    delete newProps.setValue
    delete newProps.className
    delete newProps.name
    delete newProps.type
    return (
        <div className={props.className}>
            {props.name && <H3>{props.name}</H3>}
            {props.type !== "textarea" ? (
                <input
                    {...newProps}
                    type={props.type}
                    className="border-b w-full my-2 py-2 bg-transparent"
                    onChange={props.onChange ? props.onChange : e => props.setValue(e.target.value)}
                />
            ) : (
                <textarea
                    {...newProps}
                    className="border-b w-full my-2 py-2 text-gray-500 bg-transparent"
                    rows={7}
                    // @ts-ignore
                    onChange={props.onChange ? props.onChange : e => props.setValue(e.target.value)}
                />
            )}
        </div>
    )
}

export default Input