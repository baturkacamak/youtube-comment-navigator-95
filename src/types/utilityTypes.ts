import {ComponentType, SVGProps} from "react";

export interface ExtractOptions {
    defaultValue?: any;
}

export interface Option {
    value: string;
    label: string;
    icon?: ComponentType<SVGProps<SVGSVGElement>>;
}