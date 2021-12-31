import H3 from "./H3";

const Input = ({name, value, setValue, type="text", id="", placeholder="", onChange, my=8, onKeyDown=null} : {
    name?: string,
    value: string,
    setValue?: any,
    onChange?: () => any, // you need one of setValue and onChange
    type?: "text"|"textarea"|"date",
    id?: string,
    placeholder?: string,
    my?: number,
    onKeyDown?: (e) => any,
}) => {
    return (
        <div className={`my-${my}`}>
            {name && <H3>{name}</H3>}
            {(type == "text" || type == "date") && <input
                type={type}
                className="border-b w-full content my-2 py-2"
                placeholder={placeholder}
                value={value}
                id={id}
                onChange={onChange ? onChange : e => setValue(e.target.value)}
                onKeyDown={onKeyDown}
            />}
            {type == "textarea" && <textarea
                className="border-b w-full content my-2 py-2 text-gray-500"
                rows={7}
                placeholder={placeholder}
                value={value}
                id={id}
                onChange={onChange ? onChange : e => setValue(e.target.value)}
                onKeyDown={onKeyDown}
            />}
        </div>
    )
}

export default Input