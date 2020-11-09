import { Plugin, Compiler } from 'webpack';

export class EntryExtractPlugin extends Plugin {
    constructor()
	apply: (compiler: Compiler) => void;
}
