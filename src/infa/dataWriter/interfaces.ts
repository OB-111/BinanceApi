export interface IDataWriterEntity {

}

export interface IDataWriter {
  Write(entity: IDataWriterEntity): Promise<void>;
}

export interface ICSVWriter extends IDataWriter {
  row?: string;

}
export interface ICSVWriterEntity extends IDataWriterEntity {
  data: any;
}