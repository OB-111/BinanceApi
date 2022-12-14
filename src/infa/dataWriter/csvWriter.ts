import { ICSVWriter, ICSVWriterEntity, IDataWriterEntity } from "./interfaces";


export class CSVWriter implements ICSVWriter {
    private csvWriter: any;

    constructor() {

    }

    public createFile(path: string, header: any) {
        const createObjectCsvWriter = require('csv-writer').createObjectCsvWriter;
        this.csvWriter = createObjectCsvWriter({
            path: path,
            header: header,
            // append: true  ---> when append  is true , we cannot see the headers in the file 
        });
    }

    public async Write(entity: ICSVWriterEntity): Promise<void> {
        await this.csvWriter.writeRecords(entity.data);
    }
}

export { ICSVWriterEntity };
