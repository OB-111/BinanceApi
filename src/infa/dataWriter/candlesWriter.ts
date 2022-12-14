import { ICandleMessage } from "../../app.service";
import { CSVWriter, ICSVWriterEntity } from "./csvWriter";
import { ICSVWriter, IDataWriterEntity } from "./interfaces";

export interface ICandleWriterEntity extends IDataWriterEntity {
    data: ICandleMessage;
}

export interface ICandlesWriter extends ICSVWriter {
    
}

export class CandlesWriter extends CSVWriter implements ICandlesWriter {

    constructor() {
        super();
    }

// Defines the file structure with Open and after create the file.
    public openFile(filePath: string) {
        const path = filePath;
        const headers = [
            { id: 'startTimeAsDate', title: 'Start Time Date' },
            { id: 'closeTimeAsDate', title: 'Close Time Date' },
            { id: 'openPrice', title: 'Open Price' },
            { id: 'closePrice', title: 'Close Price' },
            { id: 'volume', title: 'Volume' },
            { id: 'highPrice', title: 'Highest Price' },
            { id: 'lowPrice', title: 'Lowest Price' },
        ];
        super.createFile(path, headers);
    }

// override Write func in CSVWriter class , first adds the entity.data to data[] , then we use write to Write the record to the file
    public override async Write(entity: ICandleWriterEntity): Promise<void> {
        const data: ICSVWriterEntity = {
            data: []
        };

        data.data.push(entity.data);
         super.Write(data);

    }

}