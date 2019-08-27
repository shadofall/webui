import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Validators, FormControl } from '@angular/forms';
import { DatePipe } from '@angular/common';

import * as _ from 'lodash';

import { Wizard } from '../../../common/entity/entity-form/models/wizard.interface';
import helptext from '../../../../helptext/task-calendar/replication/replication-wizard';
import replicationHelptext from '../../../../helptext/task-calendar/replication/replication';
import sshConnectionsHelptex from '../../../../helptext/system/ssh-connections';
import snapshotHelptext from '../../../../helptext/task-calendar/snapshot/snapshot-form';

import { DialogService, KeychainCredentialService, WebSocketService, ReplicationService, TaskService, StorageService } from '../../../../services';
import { EntityUtils } from '../../../common/entity/utils';
import { EntityFormService } from '../../../common/entity/entity-form/services/entity-form.service';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { DialogFormConfiguration } from '../../../common/entity/entity-dialog/dialog-form-configuration.interface';
import { T } from '../../../../translate-marker';

@Component({
    selector: 'app-replication-wizard',
    template: `<entity-wizard [conf]="this"></entity-wizard>`,
    providers: [KeychainCredentialService, ReplicationService, TaskService, DatePipe, EntityFormService]
})
export class ReplicationWizardComponent {

    public route_success: string[] = ['tasks', 'replication'];
    public isLinear = true;
    public summary_title = "Replication Summary";
    protected entityWizard: any;

    protected custActions: Array<any> = [
        {
            id: 'advanced_add',
            name: "Advanced Replication Creation",
            function: () => {
                this.router.navigate(
                    new Array('').concat(["tasks", "replication", "add"])
                );
            }
        }
    ];

    protected suggestName: any;

    protected wizardConfig: Wizard[] = [
        {
            label: helptext.step1_label,
            fieldConfig: [
                {
                    type: 'select',
                    name: 'exist_replication',
                    placeholder: helptext.exist_replication_placeholder,
                    tooltip: helptext.exist_replication_tooltip,
                    options: [{
                        label: '---------',
                        value: '',
                    }],
                    value: '',
                },
                {
                    type: 'select',
                    name: 'source_datasets_from',
                    placeholder: helptext.source_datasets_from_placeholder,
                    tooltip: helptext.source_datasets_from_tooltip,
                    options: [{
                        label: 'On this System',
                        value: 'local',
                    }, {
                        label: 'On a Different System',
                        value: 'remote',
                    }],
                    class: 'inline',
                    width: '50%',
                },
                {
                    type: 'select',
                    name: 'target_dataset_from',
                    placeholder: helptext.target_dataset_from_placeholder,
                    tooltip: helptext.target_dataset_from_tooltip,
                    options: [{
                        label: 'On this System',
                        value: 'local',
                    }, {
                        label: 'On a Different System',
                        value: 'remote',
                    }],
                    class: 'inline',
                    width: '50%',
                },
                {
                    type: 'select',
                    name: 'ssh_credentials_source',
                    placeholder: helptext.ssh_credentials_source_placeholder,
                    tooltip: helptext.ssh_credentials_source_tooltip,
                    options: [],
                    class: 'inline',
                    width: '50%',
                    relation: [{
                        action: 'SHOW',
                        when: [{
                            name: 'source_datasets_from',
                            value: 'remote',
                        }]
                    }],
                    isHidden: true,
                },
                {
                    type: 'select',
                    name: 'ssh_credentials_target',
                    placeholder: helptext.ssh_credentials_target_placeholder,
                    tooltip: helptext.ssh_credentials_target_tooltip,
                    options: [],
                    class: 'inline',
                    width: '50%',
                    relation: [{
                        action: 'SHOW',
                        when: [{
                            name: 'target_dataset_from',
                            value: 'remote',
                        }]
                    }],
                    isHidden: true,
                },
                {
                    type: 'explorer',
                    name: 'source_datasets',
                    placeholder: helptext.source_datasets_placeholder,
                    tooltip: helptext.source_datasets_placeholder,
                    initial: '',
                    explorerType: 'directory',
                    multiple: true,
                    customTemplateStringOptions: {
                        displayField: 'Path',
                        isExpandedField: 'expanded',
                        idField: 'uuid',
                        getChildren: this.getSourceChildren.bind(this),
                        nodeHeight: 23,
                        allowDrag: false,
                        useVirtualScroll: false,
                        useCheckbox: true,
                        useTriState: true,
                    },
                    required: true,
                    validation: [Validators.required],
                    class: 'inline',
                    width: '50%',
                    relation: [{
                        action: 'SHOW',
                        connective: 'OR',
                        when: [{
                            name: 'source_datasets_from',
                            value: 'remote',
                        }, {
                            name: 'source_datasets_from',
                            value: 'local',
                        }]
                    }],
                },
                {
                    type: 'explorer',
                    name: 'target_dataset',
                    placeholder: helptext.target_dataset_placeholder,
                    tooltip: helptext.target_dataset_placeholder,
                    initial: '',
                    explorerType: 'directory',
                    customTemplateStringOptions: {
                        displayField: 'Path',
                        isExpandedField: 'expanded',
                        idField: 'uuid',
                        getChildren: this.getTargetChildren.bind(this),
                        nodeHeight: 23,
                        allowDrag: false,
                        useVirtualScroll: false,
                    },
                    required: true,
                    validation: [Validators.required],
                    class: 'inline',
                    width: '50%',
                    relation: [{
                        action: 'SHOW',
                        connective: 'OR',
                        when: [{
                            name: 'target_dataset_from',
                            value: 'remote',
                        }, {
                            name: 'target_dataset_from',
                            value: 'local',
                        }]
                    }],
                },
                {
                    type: 'checkbox',
                    name: 'recursive',
                    placeholder: helptext.recursive_placeholder,
                    tooltip: helptext.recursive_tooltip,
                    value: true,
                    relation: [{
                        action: 'SHOW',
                        connective: 'OR',
                        when: [{
                            name: 'source_datasets_from',
                            value: 'remote',
                        }, {
                            name: 'source_datasets_from',
                            value: 'local',
                        }]
                    }],
                },
                {
                    type: 'radio',
                    name: 'transport',
                    placeholder: helptext.encryption_placeholder,
                    tooltip: helptext.encryption_tooltip,
                    options: [
                        {
                            label: 'Encryption (more secure, but slower)',
                            value: 'SSH',
                        },
                        {
                            label: 'No Encryption (less secure, but faster)',
                            value: 'SSH+NETCAT',
                        }
                    ],
                    value: 'SSH',
                    relation: [{
                        action: 'SHOW',
                        connective: 'OR',
                        when: [{
                            name: 'source_datasets_from',
                            value: 'remote',
                        }, {
                            name: 'target_dataset_from',
                            value: 'remote',
                        }]
                    }],
                },
                {
                    type: 'input',
                    name: 'name',
                    placeholder: helptext.name_placeholder,
                    tooltip: helptext.name_tooltip,
                    required: true,
                    validation: [Validators.required],
                },
            ]
        },
        {
            label: helptext.step2_label,
            fieldConfig: [
                {
                    type: 'radio',
                    name: 'schedule_method',
                    placeholder: helptext.schedule_method_placeholder,
                    tooltip: helptext.schedule_method_tooltip,
                    options: [{
                        label: 'Run On a Schedule',
                        value: 'corn',
                    }, {
                        label: 'Run Once',
                        value: 'once',
                    }],
                    value: 'corn',
                    class: 'inline',
                    width: '50%',
                },
                {
                    type: 'scheduler',
                    name: 'schedule_picker',
                    placeholder: helptext.schedule_placeholder,
                    tooltip: helptext.schedule_tooltip,
                    class: 'inline',
                    width: '50%',
                    relation: [{
                        action: 'SHOW',
                        when: [{
                            name: 'schedule_method',
                            value: 'corn',
                        }]
                    }],
                    required: true,
                    validation: [Validators.required],
                },
                {
                    type: 'radio',
                    name: 'retention_policy',
                    placeholder: helptext.retention_policy_placeholder,
                    tooltip: helptext.retention_policy_tooltip,
                    options: [{
                        label: 'Same as Source',
                        value: 'SOURCE',
                    }, {
                        label: 'Never Delete',
                        value: 'NONE',
                    }, {
                        label: 'Custom',
                        value: 'CUSTOM',
                    }],
                    value: 'SOURCE',
                    class: 'inline',
                    width: '50%',
                },
                {
                    placeholder: helptext.lifetime_value_placeholder,
                    type: 'input',
                    name: 'lifetime_value',
                    inputType: 'number',
                    value: 2,
                    required: true,
                    validation: [Validators.required, Validators.min(0)],
                    class: 'inline',
                    width: '25%',
                    relation: [{
                        action: 'SHOW',
                        connective: 'OR',
                        when: [{
                            name: 'retention_policy',
                            value: 'CUSTOM',
                        }]
                    }],
                },
                {
                    type: 'select',
                    name: 'lifetime_unit',
                    tooltip: helptext.lifetime_unit_tooltip,
                    options: [{
                        label: 'Hours',
                        value: 'HOUR',
                    }, {
                        label: 'Days',
                        value: 'DAY',
                    }, {
                        label: 'Weeks',
                        value: 'WEEK',
                    }, {
                        label: 'Months',
                        value: 'MONTH',
                    }, {
                        label: 'Years',
                        value: 'YEAR',
                    }],
                    value: 'WEEK',
                    class: 'inline',
                    width: '25%',
                    relation: [{
                        action: 'SHOW',
                        connective: 'OR',
                        when: [{
                            name: 'retention_policy',
                            value: 'CUSTOM',
                        }]
                    }],
                    required: true,
                    validation: [Validators.required],
                },
            ]
        }
    ];

    protected dialogFieldConfig = [
        {
          type: 'input',
          name: 'name',
          placeholder: sshConnectionsHelptex.name_placeholder,
          tooltip: sshConnectionsHelptex.name_tooltip,  
        },
        {
            type: 'select',
            name: 'setup_method',
            placeholder: sshConnectionsHelptex.setup_method_placeholder,
            tooltip: sshConnectionsHelptex.setup_method_tooltip,
            options: [
                {
                    label: 'Manual',
                    value: 'manual',
                }, {
                    label: 'Semi-automatic (FreeNAS only)',
                    value: 'semiautomatic',
                }
            ],
            value: 'semiautomatic',
            isHidden: false,
        },
        {
            type: 'input',
            name: 'host',
            placeholder: sshConnectionsHelptex.host_placeholder,
            tooltip: sshConnectionsHelptex.host_tooltip,
            required: true,
            validation: [Validators.required],
            relation: [{
                action: 'SHOW',
                when: [{
                    name: 'setup_method',
                    value: 'manual',
                }]
            }],
        }, {
            type: 'input',
            inputType: 'number',
            name: 'port',
            placeholder: sshConnectionsHelptex.port_placeholder,
            tooltip: sshConnectionsHelptex.port_tooltip,
            value: 22,
            relation: [{
                action: 'SHOW',
                when: [{
                    name: 'setup_method',
                    value: 'manual',
                }]
            }],
        }, {
            type: 'input',
            name: 'url',
            placeholder: sshConnectionsHelptex.url_placeholder,
            tooltip: sshConnectionsHelptex.url_tooltip,
            required: true,
            validation: [Validators.required],
            relation: [{
                action: 'SHOW',
                when: [{
                    name: 'setup_method',
                    value: 'semiautomatic',
                }]
            }],
        }, {
            type: 'input',
            name: 'username',
            placeholder: sshConnectionsHelptex.username_placeholder,
            tooltip: sshConnectionsHelptex.username_tooltip,
            value: 'root',
            required: true,
            validation: [Validators.required],
        }, {
            type: 'input',
            inputType: 'password',
            name: 'password',
            placeholder: sshConnectionsHelptex.password_placeholder,
            tooltip: sshConnectionsHelptex.password_tooltip,
            togglePw: true,
            required: true,
            validation: [Validators.required],
            relation: [{
                action: 'SHOW',
                when: [{
                    name: 'setup_method',
                    value: 'semiautomatic',
                }]
            }],
        }, {
            type: 'select',
            name: 'private_key',
            placeholder: sshConnectionsHelptex.private_key_placeholder,
            tooltip: sshConnectionsHelptex.private_key_tooltip,
            options: [
                {
                    label: 'Generate New',
                    value: 'NEW'
                }
            ],
            required: true,
            validation: [Validators.required],
        }, {
            type: 'input',
            name: 'remote_host_key',
            isHidden: true,
        }, {
            type: 'select',
            name: 'cipher',
            placeholder: helptext.cipher_placeholder,
            tooltip: helptext.cipher_tooltip,
            options: [
                {
                    label: 'Standard (Secure)',
                    value: 'STANDARD',
                }, {
                    label: 'Fast (Less secure)',
                    value: 'FAST',
                }, {
                    label: 'Disabled (Not encrypted)',
                    value: 'DISABLED',
                }
            ],
            value: 'STANDARD',
        }
      ];

    protected saveSubmitText = 'START REPLICATION';
    protected directions = ['PULL', 'PUSH'];
    protected selectedReplicationTask: any;
    protected semiSSHFieldGroup: any[] = [
        'url',
        'password',
    ];

    protected createCalls = {
        private_key: 'keychaincredential.create',
        ssh_credentials_semiautomatic: 'keychaincredential.remote_ssh_semiautomatic_setup',
        ssh_credentials_manual:'keychaincredential.create',
        periodic_snapshot_tasks: 'pool.snapshottask.create',
        replication: 'replication.create',
    }

    protected deleteCalls = {
        private_key: 'keychaincredential.delete',
        ssh_credentials: 'keychaincredential.delete',
        periodic_snapshot_tasks: 'pool.snapshottask.delete',
        replication: 'replication.delete',
    }

    constructor(private router: Router, private keychainCredentialService: KeychainCredentialService,
        private loader: AppLoaderService, private dialogService: DialogService,
        private ws: WebSocketService, private replicationService: ReplicationService,
        private taskService: TaskService, private storageService: StorageService,
        private datePipe: DatePipe, private entityFormService: EntityFormService) {

    }

    isCustActionVisible(id, stepperIndex) {
        if (stepperIndex == 0) {
            return true;
        }
        return false;
    }

    afterInit(entityWizard) {
        this.entityWizard = entityWizard;

        this.step0Init();
        this.step1Init();
    }

    step0Init() {
        const exist_replicationField = _.find(this.wizardConfig[0].fieldConfig, { name: 'exist_replication' });
        this.replicationService.getReplicationTasks().subscribe(
            (res) => {
                for (const task of res) {
                    const lable = task.name + ' (' + ((task.state && task.state.datetime) ? 'last run ' + this.datePipe.transform(new Date(task.state.datetime.$date), 'MM/dd/yyyy') : 'never ran') + ')';
                    exist_replicationField.options.push({ label: lable, value: task });
                }
            }
        )

        const privateKeyField = _.find(this.dialogFieldConfig, { name: 'private_key' });
        this.keychainCredentialService.getSSHKeys().subscribe(
            (res) => {
                for (const i in res) {
                    privateKeyField.options.push({ label: res[i].name, value: res[i].id });
                }
            }
        )

        const ssh_credentials_source_field = _.find(this.wizardConfig[0].fieldConfig, { 'name': 'ssh_credentials_source' });
        const ssh_credentials_target_field = _.find(this.wizardConfig[0].fieldConfig, { 'name': 'ssh_credentials_target' });
        this.keychainCredentialService.getSSHConnections().subscribe((res) => {
            for (const i in res) {
                ssh_credentials_source_field.options.push({ label: res[i].name, value: res[i].id });
                ssh_credentials_target_field.options.push({ label: res[i].name, value: res[i].id });
            }
            ssh_credentials_source_field.options.push({ label: 'Create New', value: 'NEW' });
            ssh_credentials_target_field.options.push({ label: 'Create New', value: 'NEW' });
        })

        this.entityWizard.formArray.controls[0].controls['exist_replication'].valueChanges.subscribe((value) => {
            if (value !== undefined && value !== '') {
                this.loadReplicationTask(value);
            } else {
                if (this.selectedReplicationTask !== undefined && this.selectedReplicationTask !== '') {
                    // reset form
                    this.clearReplicationTask();

                }
            }
            this.selectedReplicationTask = value;
        });
        this.entityWizard.formArray.controls[0].controls['source_datasets'].statusChanges.subscribe((value) => {
            this.genTaskName();
        });
        this.entityWizard.formArray.controls[0].controls['target_dataset'].statusChanges.subscribe((value) => {
            this.genTaskName();
        });

        for (const i of ['source', 'target']) {
            const credentialName = 'ssh_credentials_' + i;
            const datasetName = i === 'source' ? 'source_datasets' : 'target_dataset';
            const datasetFrom = datasetName + '_from';

            this.entityWizard.formArray.controls[0].controls[datasetFrom].valueChanges.subscribe((value) => {
                if (value === 'remote') {
                    if (datasetFrom === 'source_datasets_from') {
                        this.entityWizard.formArray.controls[0].controls['target_dataset_from'].setValue('local');
                        this.setDisable('target_dataset_from', true, false, 0);
                    }
                    const disabled = this.entityWizard.formArray.controls[0].controls[credentialName].value ? false : true;
                    this.setDisable(datasetName, disabled, false, 0);
                } else {
                    if (datasetFrom === 'source_datasets_from' && this.entityWizard.formArray.controls[0].controls['target_dataset_from'].disabled) {
                        this.setDisable('target_dataset_from', false, false, 0);
                    }
                    this.setDisable(datasetName, false, false, 0);
                }
            });

            this.entityWizard.formArray.controls[0].controls[credentialName].valueChanges.subscribe((value) => {
                if (value === 'NEW') {
                    // pop up dialog
                    this.createSSHConnection(credentialName);
                } else {
                    const explorerComponent = _.find(this.wizardConfig[0].fieldConfig, {name: datasetName}).customTemplateStringOptions.explorerComponent;
                    if (explorerComponent) {
                        explorerComponent.nodes = [{
                            mountpoint: explorerComponent.config.initial,
                            name: explorerComponent.config.initial,
                            hasChildren: true
                        }];
                        this.entityWizard.formArray.controls[0].controls[datasetName].setValue('');
                    }
                    this.setDisable(datasetName, false, false, 0);
                }
            });
        }

        this.entityWizard.formArray.controls[0].controls['recursive'].valueChanges.subscribe((value) => {
            const explorerComponent = _.find(this.wizardConfig[0].fieldConfig, {name: 'source_datasets'}).customTemplateStringOptions;
            if (explorerComponent) {
                explorerComponent.useTriState = value;
            }
        });
    }

    step1Init() {
        this.entityWizard.formArray.controls[1].controls['retention_policy'].valueChanges.subscribe((value) => {
            const disable = value === 'SOURCE' ? true : false;
            disable ? this.entityWizard.formArray.controls[1].controls['lifetime_value'].disable() : this.entityWizard.formArray.controls[1].controls['lifetime_value'].enable();
            disable ? this.entityWizard.formArray.controls[1].controls['lifetime_unit'].disable() : this.entityWizard.formArray.controls[1].controls['lifetime_unit'].enable();
        });
    }

    getSourceChildren(node) {
        const fromLocal = this.entityWizard.formArray.controls[0].controls['source_datasets_from'].value === 'local' ? true : false;
        const sshCredentials = this.entityWizard.formArray.controls[0].controls['ssh_credentials_source'].value;

        if (fromLocal) {
            return new Promise((resolve, reject) => {
                resolve(this.entityFormService.getPoolDatasets());
            });
        } else {
            return new Promise((resolve, reject) => {
                this.replicationService.getRemoteDataset('SSH', sshCredentials, this).then(
                    (res) => {
                        resolve(res);
                    },
                    (err) => {
                        node.collapse();
                    })
            });
        }
    }

    getTargetChildren(node) {
        const fromLocal = this.entityWizard.formArray.controls[0].controls['target_dataset_from'].value === 'local' ? true : false;
        const sshCredentials = this.entityWizard.formArray.controls[0].controls['ssh_credentials_target'].value;
        if (fromLocal) {
            return new Promise((resolve, reject) => {
                resolve(this.entityFormService.getPoolDatasets());
            });
        } else {
            return new Promise((resolve, reject) => {
                this.replicationService.getRemoteDataset('SSH', sshCredentials, this).then(
                    (res) => {
                        resolve(res);
                    },
                    (err) => {
                        node.collapse();
                    })
            });
        }
    }

    setDisable(field: any, disabled: boolean, isHidden: boolean, stepIndex: number) {
        const control: any = _.find(this.wizardConfig[stepIndex].fieldConfig, { 'name': field });
        control['isHidden'] = isHidden;
        control.disabled = disabled;
        disabled ? this.entityWizard.formArray.controls[stepIndex].controls[field].disable() : this.entityWizard.formArray.controls[stepIndex].controls[field].enable();
    }

    loadReplicationTask(task) {
        if (task.direction === 'PUSH') {
            task['source_datasets_from'] = 'local';
            task['target_dataset_from'] = 'remote';
            task['ssh_credentials_target'] = task.ssh_credentials.id;
        } else {
            task['source_datasets_from'] = 'remote';
            task['target_dataset_from'] = 'local';
            task['ssh_credentials_source'] = task.ssh_credentials.id;
        }

        for (let i of ['source_datasets_from','target_dataset_from', 'ssh_credentials_source', 'ssh_credentials_target', 'transport', 'source_datasets', 'target_dataset']) {
            const ctrl = this.entityWizard.formArray.controls[0].controls[i];
            if (ctrl && !ctrl.disabled) {
                ctrl.setValue(task[i]);
            }
        }

        if (task.schedule || task.periodic_snapshot_tasks ) {
            const scheduleData = task.periodic_snapshot_tasks[0] || task;
            task['schedule_method'] = 'corn';
            task['schedule_picker'] = scheduleData.schedule.minute + " " +scheduleData.schedule.hour + " " + scheduleData.schedule.dom + " " + scheduleData.schedule.month + " " + scheduleData.schedule.dow;
            
            if (scheduleData['lifetime_value'] === null && scheduleData['lifetime_unit'] === null) {
                task['retention_policy'] = 'NONE';
            } else {
                task['lifetime_value'] = scheduleData['lifetime_value'];
                task['lifetime_unit'] = scheduleData['lifetime_unit'];
                task['retention_policy'] = task.schedule !== null ? 'CUSTOM' : 'SOURCE';
            }
        }
        // periodic_snapshot_tasks
        for (let i of ['schedule_method', 'schedule_picker', 'retention_policy', 'lifetime_value', 'lifetime_unit']) {
            const ctrl = this.entityWizard.formArray.controls[1].controls[i];
            if (ctrl && !ctrl.disabled) {
                ctrl.setValue(task[i]);
            }
        }

    }

    clearReplicationTask() {
        this.entityWizard.formArray.reset();
    }

    parsePickerTime(picker) {
        const spl = picker.split(" ");
        return {
            minute: spl[0],
            hour: spl[1],
            dom: spl[2],
            month: spl[3],
            dow: spl[4],
        };
    }

    async doCreate(data, item) {
        let payload;
        if (item === 'private_key') {
            payload = {
                name: data['name'] + ' Key',
                type: 'SSH_KEY_PAIR',
                attributes: data['sshkeypair'],
            }
            return this.ws.call(this.createCalls[item], [payload]).toPromise();
        }

        if (item === 'ssh_credentials') {
            item += '_' + data['setup_method'];
            if (data['setup_method'] == 'manual') {
                payload = {
                    name: data['name'],
                    type: 'SSH_CREDENTIALS',
                    attributes: {
                        cipher: data['cipher'],
                        host: data['host'],
                        port: data['port'],
                        private_key: data['private_key'],
                        remote_host_key: data['remote_host_key'],
                        username: data['username'],
                    }
                };
            } else {
                payload = {
                    name: data['name'],
                    private_key: data['private_key'],
                    cipher: data['cipher'],
                };
                for (const i of this.semiSSHFieldGroup) {
                    payload[i] = data[i];
                }
            }
            return this.ws.call(this.createCalls[item], [payload]).toPromise();
        }

        if (item === 'periodic_snapshot_tasks') {
            const snapshotPromises = [];
            for (const dataset of data['source_datasets']) {
                payload = {
                    dataset: dataset,
                    recursive: data['recursive'],
                    schedule: data['schedule'],
                    lifetime_value: 2, // payload['lifetime_value'] ,
                    lifetime_unit: 'WEEK', //payload['lifetime_unit'],
                    naming_schema: 'auto-%Y-%m-%d_%H-%M',
                    enabled: true,
                };
                snapshotPromises.push(this.ws.call(this.createCalls[item], [payload]).toPromise());
            }
            return Promise.all(snapshotPromises);
        }
        if (item === 'replication') {
            payload = {
                name: data['name'],
                direction: 'PUSH',
                source_datasets: data['source_datasets'],
                target_dataset: data['target_dataset'],
                ssh_credentials: data['ssh_credentials_source'] || data['ssh_credentials_target'],
                transport: data['transport'] ? data['transport'] : 'LOCAL',
                retention_policy: data['retention_policy'],
                recursive: data['recursive'],
            }

            // schedule option
            if (data['schedule_method'] === 'corn') {
                payload['periodic_snapshot_tasks'] = data['periodic_snapshot_tasks'];
                payload['auto'] = true;
            } else {
                payload['also_include_naming_schema'] = ['auto-%Y-%m-%d_%H-%M']; //default?
                payload['auto'] = false;
            }
    
            if (data['retention_policy'] === 'CUSTOM') {
                payload['lifetime_value'] = data['lifetime_value'];
                payload['lifetime_unit'] = data['lifetime_unit'];
            }
            
            if (payload['transport'] === 'SSH+NETCAT') {
                payload['netcat_active_side'] = 'REMOTE'; // default?
            }
            return this.ws.call(this.createCalls[item], [payload]).toPromise();
        }
    }

    async customSubmit(value) {
        this.loader.open();
        let toStop = false;

        const createdItems = {
            private_key: null,
            ssh_credentials: null,
            periodic_snapshot_tasks: null,
            replication: null,
        }

        for (const item in createdItems) {
            if (!toStop) {
                if (!((item === 'private_key' && value['private_key'] !== 'NEW') || (item === 'ssh_credentials' && value['ssh_credentials'] !== 'NEW') || (item === 'periodic_snapshot_tasks' && value['schedule_method'] !== 'corn'))) {
                    await this.doCreate(value, item).then(
                        (res) => {
                            value[item] = res.id || res.map(snapshot => snapshot.id);
                            createdItems[item] = res.id || res.map(snapshot => snapshot.id);
                        },
                        (err) => {
                            new EntityUtils().handleWSError(this, err, this.dialogService);
                            toStop = true;
                            this.rollBack(createdItems);
                        }
                    )
                }
            }
        }

        this.loader.close();
        if (!toStop) {
            this.router.navigate(new Array('/').concat(this.route_success));
        }
    }


    async rollBack(items) {
        const keys = Object.keys(items).reverse();
        for (let i = 0; i < keys.length; i++) {
            if (items[keys[i]] != null) {
                await this.ws.call(this.deleteCalls[keys[i]], [items[keys[i]]]).toPromise().then(
                    (res) => {
                        console.log('rollback ' + keys[i], res);
                    }
                );
            }
        }
    }

    createSSHConnection(activedField) {
        const self = this;
    
        const conf: DialogFormConfiguration = {
          title: T("Create SSH Connection"),
          fieldConfig: this.dialogFieldConfig,
          saveButtonText: T("Create SSH Connection"),
          customSubmit: async function (entityDialog) {
            const value = entityDialog.formValue;
            self.entityWizard.loader.open();

            if (value['private_key'] == 'NEW') {
                await self.replicationService.genSSHKeypair().then(
                    (res) => {
                        value['sshkeypair'] = res;
                    },
                    (err) => {
                        new EntityUtils().handleWSError(this, err, this.dialogService);
                    }
                )
            }
            if (value['setup_method'] == 'manual') {
                await this.getRemoteHostKey(value).then(
                    (res) => {
                        value['remote_host_key'] = res;
                    },
                    (err) => {
                        new EntityUtils().handleWSError(this, err, this.dialogService);
                    }
                )
            }

            const createdItems = {
                private_key: null,
                ssh_credentials: null,
            }
    
            for (const item in createdItems) {
                if (!((item === 'private_key' && value['private_key'] !== 'NEW') )) {
                    await self.doCreate(value, item).then(
                        (res) => {
                            value[item] = res.id;
                            createdItems[item] = res.id;
                            if (item === 'private_key') {
                                const privateKeyField = _.find(self.dialogFieldConfig, { name: 'private_key' });
                                privateKeyField.options.push({ label: res.name + ' (New Created)', value: res.id });
                            }
                            if (item === 'ssh_credentials') {
                                const ssh_credentials_source_field = _.find(self.wizardConfig[0].fieldConfig, { 'name': 'ssh_credentials_source' });
                                const ssh_credentials_target_field = _.find(self.wizardConfig[0].fieldConfig, { 'name': 'ssh_credentials_target' });
                                ssh_credentials_source_field.options.push({ label: res.name + ' (New Created)', value: res.id });
                                ssh_credentials_target_field.options.push({ label: res.name + ' (New Created)', value: res.id });
                                self.entityWizard.formArray.controls[0].controls[activedField].setValue(res.id)
                            }
                            entityDialog.dialogRef.close(true);
                        },
                        (err) => {
                            new EntityUtils().handleWSError(this, err, this.dialogService);
                            this.rollBack(createdItems);
                        }
                    )
                }
            }
            self.entityWizard.loader.close();
          }
        }
        this.dialogService.dialogForm(conf);
      }

      getRemoteHostKey(value) {
        const payload = {
            'host': value['host'],
            'port': value['port'],
        };
        return this.ws.call('keychaincredential.remote_ssh_host_key_scan', [payload]).toPromise();
    }

    genTaskName() {
        const source = this.entityWizard.formArray.controls[0].controls['source_datasets'].value || [];
        const target = this.entityWizard.formArray.controls[0].controls['target_dataset'].value;
        if (source.length > 3) {
            this.suggestName = source[0] + ',...,' + source[source.length - 1] + ' - ' + target;
        } else {
            this.suggestName = source.join(',') + ' - ' + target;
        }
        this.entityWizard.formArray.controls[0].controls['name'].setValue(this.suggestName);
    }
}
