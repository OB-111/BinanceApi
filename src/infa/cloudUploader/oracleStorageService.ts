import { IStorageEntity, IStorageServiceResult } from "./iStorageService";
import { StorageService } from "./storageService";
import common = require("oci-common");
import { ObjectStorageClient, UploadManager } from "oci-objectstorage";
import { readdir, unlinkSync, rename, existsSync, mkdirSync } from "fs";
import { basename, join } from "path";
import { Utils } from "../webSocket/utils";

export interface IOracleBucketStorageEntity extends IStorageEntity {
    filePath: string;
    successCallback?: any;
    overrideExistingFile?: boolean;
    symbol?: string;
}

export interface IOracleStorageServiceResult extends IStorageServiceResult {
    result: string;
    code: UploadResult;
}

export enum UploadResult {
    SaveSuccessfully,
    UploadedSuccessfully,
    Error,
    FileAlreadyExist
}               

export class OracleStorageService extends StorageService {
    private uploadManager: UploadManager;
    private callbackMap = new Map<string, any>();

    constructor(
        private namespaceName: string,
        private bucketName: string,
        private uploadPath: string) {
        super();

        this.init();
    }

    public override async upload(entity: IOracleBucketStorageEntity): Promise<IOracleStorageServiceResult> {
        if (!entity?.filePath) throw new Error("entity or file can't be null");

        if (!existsSync(entity.filePath)) {
            throw new Error(`File ${entity.filePath} not exist!!`);
        }

        const path = require("path");
        const fileName = path.basename(entity.filePath);
        const symbolPath = join(this.uploadPath, entity.symbol);
        if (!existsSync(symbolPath)) {
            mkdirSync(symbolPath, { recursive: true });
          }
        const destinationPath = join(symbolPath, fileName);
        if (entity.successCallback) {
            this.callbackMap.set(fileName, entity.successCallback);
        }
        await this.moveFile(entity.filePath, destinationPath);
        const result: IOracleStorageServiceResult = {
            result: "File save successfully",
            code: UploadResult.SaveSuccessfully
        };
        return result;
    }

    protected override init() {
        process.env['OCI_CONFIG_FILE'] = './.oci/config';

        const provider = new common.ConfigFileAuthenticationDetailsProvider();
        const client = new ObjectStorageClient({ authenticationDetailsProvider: provider });
        this.uploadManager = new UploadManager(client, { enforceMD5: true });

        this.watchForFiles(this.uploadPath);
    }

    private async watchForFiles(path: string): Promise<void> {
        try {
            while (true) {
                const files = await this.getFiles(path);
                if (files.length === 0) {
                    await Utils.wait(5000);
                    continue;
                }

                const promises: any[] = [];

                // Loop over files and upload them asyncroneslly while saving their operations in promises array
                files.forEach(async filename => {
                    const objectName = `${basename(filename)}`;
                    this.writeLog(`Uploading ${objectName} file...`);
                    const parts = filename.split('/');

                    try {
                        promises.push({
                            fileName: filename,
                            filePath: filename, // Save file for later deletion after successful upload
                            // Save upload promise result for later wait for all
                            promise: this.uploadManager.upload({
                                content: { filePath: filename },
                                requestDetails: {
                                    namespaceName: this.namespaceName,
                                    bucketName: this.bucketName,
                                    objectName: join(parts[parts.length - 2], objectName)
                                }
                            })
                        });
                    } catch (ex) {
                        this.writeLog(`Failed due to ${ex}`);
                    }
                });

                const responses = await Promise.all(promises.map(f => f.promise));
                // Loop over results while deleting only files with content inside response
                for (let index = 0; index < responses.length; index++) {
                    const response = responses[index];
                    if (!response) continue;

                    // Delete uploaded file
                    if (await this.deleteFile(promises[index].filePath)) {
                        this.writeLog(`File ${promises[index].filePath} deleted!!`);
                    }

                    if (this.callbackMap.has(promises[index].fileName)) {
                        this.callbackMap[promises[index].fileName]?.callback(promises[index].fileName);
                        this.callbackMap.delete(promises[index].fileName);
                    }
                }
            }
        } catch (error) {
            debugger
        }
    }
//  check if dir exist , if so append current file else create new dir and keep adding files
    private getFiles(path: string): Promise<any[]> {
        return new Promise<string[]>(resolve => {
            readdir(path, { withFileTypes: true }, async (err, dirs) => {
                let files: any[] = [];
                if(!dirs) {
                    resolve(files);
                    return;
                } 

                for (let index = 0; index < dirs.length; index++) {
                    const dir = dirs[index];
                    if(dir.isFile()) {
                        files.push(join(path, dir.name));
                    } else if (dir.isDirectory()) {
                        files = files.concat(await this.getFiles(join(path, dir.name)));
                    }
                }
                
                resolve(!err ? files : []);
            });
        });
    }

    private async deleteFile(filePath: string): Promise<boolean> {
        if (!filePath) return false;

        try {
            await unlinkSync(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    private moveFile(sourcePath: string, destinationPath: string) {
        return new Promise<boolean>(resolve => {
            rename(sourcePath, destinationPath, (err) => {
                resolve(!err ? true : false);
            });
        });
    }

    private writeLog(message) {

    }
}

